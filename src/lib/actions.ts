
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ApiKey, TokenFetchResult, TokenDetails, TokenMetadata } from "@/lib/types";
import chainsConfig from "@/lib/chains.json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchFromExplorer, fetchFromRpc, fetchLogoFromCoinGecko, uploadLogo, uploadLogoFromBuffer } from "@/lib/fetchers";
import axios from 'axios';

const STORAGE_BUCKET = "token_logos";
const CACHE_TTL = Number(process.env.CACHE_TTL_MS || 7 * 24 * 3600 * 1000);


// --- Add/Update Token ---

export type AddTokenState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addTokenSchema = z.object({
  name: z.string().min(1, "Token name is required."),
  symbol: z.string().min(1, "Token symbol is required."),
  networkId: z.string().min(1, "Network ID is required."), // This is the UUID from our networks table
  decimals: z.coerce.number().int().min(0, "Decimals must be a positive integer."),
  logoFile: z.instanceof(File).optional(),
  logo_url: z.string().optional(), // This can be a URL from CoinGecko fetch
  contract: z.string().min(1, "Contract address is required."),
});

export async function addToken(
  prevState: AddTokenState,
  formData: FormData
): Promise<AddTokenState> {
  const validated = addTokenSchema.safeParse({
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      networkId: formData.get('networkId'),
      decimals: formData.get('decimals'),
      logoFile: formData.get('logo'),
      logo_url: formData.get('logo_url'),
      contract: formData.get('contract'),
  });

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }
  
  const { logoFile, symbol, networkId, contract, name, decimals, logo_url } = validated.data;
  
  try {
    const { data: network } = await supabaseAdmin.from("networks").select('name').eq('id', networkId).single();
    if (!network) throw new Error("Network not found.");

    let logoKey: string | undefined;
    let finalLogoUrl: string | undefined;

    if (logoFile && logoFile.size > 0) {
        const uploadedLogo = await uploadLogo(logoFile, contract, network.name);
        if (uploadedLogo) {
            logoKey = uploadedLogo.storage_path;
            finalLogoUrl = uploadedLogo.public_url;
        }
    } else if (logo_url) {
        // If we have a logo URL from an external source, download and store it.
        try {
            const response = await axios.get(logo_url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || 'image/png';
            
            const publicUrl = await uploadLogoFromBuffer(network.name.toLowerCase(), `${contract.toLowerCase()}.${contentType.split('/')[1] || 'png'}`, buffer, contentType);

            if(publicUrl) {
                finalLogoUrl = publicUrl;
                logoKey = `${network.name.toLowerCase()}/${contract.toLowerCase()}.${contentType.split('/')[1] || 'png'}`;
            }

        } catch (e: any) {
            console.error(`Failed to import logo from ${logo_url}: ${e.message}`);
            // Continue without a logo if the import fails
        }
    }
    
    // Upsert the logo record if we have one
    if (logoKey && finalLogoUrl) {
         await supabaseAdmin.rpc('upsert_token_logo', {
            p_contract: contract,
            p_symbol: symbol,
            p_network: network.name.toLowerCase(),
            p_storage_path: logoKey,
            p_public_url: finalLogoUrl
        });
    }

    // Prepare the unified token details object
    const tokenDetails: TokenDetails = {
        name,
        symbol,
        decimals,
        network: network.name.toLowerCase(),
        contract_address: contract.toLowerCase(),
        logo_key: logoKey,
        extra: {}
    };
    
    // Upsert the main token metadata record
    const { error: upsertError } = await supabaseAdmin.rpc('upsert_token_metadata', {
        p_contract: contract,
        p_network: network.name.toLowerCase(),
        p_token_details: tokenDetails,
        p_logo_key: logoKey || null,
        p_logo_url: finalLogoUrl || null,
        p_source: "manual",
        p_verified: true, // Manually added tokens are considered verified
    });

    if (upsertError) {
      throw new Error(`Database upsert error: ${upsertError.message}`);
    }

    revalidatePath("/tokens");
    revalidatePath("/add-token");
    return { status: "success", message: `${symbol.toUpperCase()} on ${network.name} saved successfully!` };

  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}


// --- API Key Management ---

export async function getApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabaseAdmin
    .from('api_clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
  return data;
}

export type GenerateApiKeyState = {
  status: "idle" | "success" | "error" | "executing";
  message?: string;
  newKey?: string;
};

const generateApiKeySchema = z.object({
  name: z.string().min(1, "Key name is required."),
});

export async function generateNewApiKey(
  prevState: GenerateApiKeyState,
  formData: FormData
): Promise<GenerateApiKeyState> {
  const validated = generateApiKeySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Key name is required." };
  }
  
  try {
    const { data: newKey, error } = await supabaseAdmin.rpc("generate_api_key", {
      p_client_name: validated.data.name,
    });
  
    if (error) {
      throw new Error(`Failed to generate key: ${error.message}`);
    }
    
    revalidatePath('/api-keys');
    return { status: "success", message: "API Key generated successfully.", newKey };
  } catch (e: any) {
     return { status: "error", message: e.message };
  }
}

export async function deleteApiKey(
  keyId: number,
): Promise<{ status: "success" | "error", message: string }> {
  const { error } = await supabaseAdmin
    .from('api_clients')
    .delete()
    .eq('id', keyId);

  if (error) {
    return { status: "error", message: `Failed to delete key: ${error.message}` };
  }
  
  revalidatePath('/api-keys');
  return { status: "success", message: "API Key deleted." };
}

export async function deleteToken(tokenId: string): Promise<{ status: "success" | "error", message: string }> {
  const { data: token } = await supabaseAdmin
    .from("token_metadata")
    .select("logo_key")
    .eq("id", tokenId)
    .single();

  if (token && token.logo_key) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([token.logo_key]);
  }

  const { error } = await supabaseAdmin
    .from("token_metadata")
    .delete()
    .eq("id", tokenId);

  if (error) {
    return {
      status: "error",
      message: `Failed to delete token: ${error.message}`,
    };
  }

  revalidatePath("/tokens");
  return { status: "success", message: "Token deleted." };
}

// --- Token Search ---

export type SearchState = {
  status: "idle" | "success" | "error";
  message?: string;
  token?: TokenMetadata;
};

const searchTokenSchema = z.object({
  tokenSymbol: z.string().min(1, "Token symbol is required."),
});

export async function searchToken(
  prevState: SearchState,
  formData: FormData
): Promise<SearchState> {
  const validated = searchTokenSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Token symbol is required." };
  }
  
  const { tokenSymbol } = validated.data;

  try {
    const { data, error } = await supabaseAdmin
      .from("token_metadata")
      .select("*")
      .ilike("token_details->>symbol", tokenSymbol)
      .limit(1)
      .single();

    if (error || !data) {
      return { status: "error", message: `Token "${tokenSymbol}" not found.` };
    }
    
    return { status: "success", token: data };
  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}

// --- Network Management ---

export type AddNetworkState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addNetworkSchema = z.object({
  name: z.string().min(1, "Network name is required."),
  chain_id: z.coerce.number().int("Chain ID must be an integer."),
  explorer_api_base_url: z.string().url("Must be a valid URL."),
});

export async function addNetwork(prevState: AddNetworkState, formData: FormData): Promise<AddNetworkState> {
  const validated = addNetworkSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }

  try {
    const { error } = await supabaseAdmin.from("networks").insert({
        ...validated.data,
        explorer_api_key_env_var: 'ETHERSCAN_API_KEY' // Always use the main key
    });
    if (error) {
      if (error.code === '23505') {
         throw new Error(`Network with this name or Chain ID already exists.`);
      }
      throw error;
    }

    revalidatePath("/networks");
    return { status: "success", message: "Network added successfully!" };
  } catch(e: any) {
    return { status: "error", message: e.message };
  }
}

export async function deleteNetwork(networkId: string): Promise<{ status: "success" | "error", message: string }> {
  const { data: network } = await supabaseAdmin.from("networks").select('name').eq("id", networkId).single();
  if (!network) {
    return { status: "error", message: "Network not found."};
  }

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from("token_metadata")
    .select("id")
    .eq("network", network.name.toLowerCase()) 
    .limit(1);

  if (tokenError) {
    return { status: "error", message: `Failed to check for tokens on network: ${tokenError.message}`};
  }

  if (tokens && tokens.length > 0) {
    return { status: "error", message: "Cannot delete network because it still has tokens associated with it." };
  }

  const { error } = await supabaseAdmin
    .from("networks")
    .delete()
    .eq("id", networkId);

  if (error) {
    return {
      status: "error",
      message: `Failed to delete network: ${error.message}`,
    };
  }

  revalidatePath("/networks");
  revalidatePath("/tokens");
  return { status: "success", message: "Network deleted." };
}

// --- Universal Token Data Fetcher (Production-Grade) ---

export type FetchMetadataState = {
  status: "idle" | "success" | "error";
  message?: string;
  metadata?: TokenFetchResult;
  networkId?: string;
  contractAddress?: string;
}

const fetchMetadataSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required."),
  networkId: z.string().min(1, "Please select a network."), // This is the UUID from our networks table
});

function findChainByChainId(chainId: number) {
    const chain = chainsConfig.find(c => Number(c.chainId) === Number(chainId));
    if (!chain) {
        throw new Error(`Configuration for chainId ${chainId} not found in chains.json`);
    }
    return chain;
}

async function getCachedToken(contract: string, chainId: number) {
    const { data: network } = await supabaseAdmin.from("networks").select("name").eq("chain_id", chainId).single();
    if (!network) return null;
    
    const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("*")
        .eq("contract_address", contract.toLowerCase())
        .eq("network", network.name.toLowerCase())
        .maybeSingle();
    
    if (error) {
        console.error("Error fetching cached token:", error);
        return null;
    };

    return data;
}

export async function fetchTokenMetadata(prevState: FetchMetadataState, formData: FormData): Promise<FetchMetadataState> {
    const validated = fetchMetadataSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validated.success) {
        return { status: "error", message: "Both contract address and network are required." };
    }

    const { contractAddress, networkId } = validated.data;
    const forceRefresh = formData.get("forceRefresh") === "true";
  
    try {
        const { data: networkDb } = await supabaseAdmin.from("networks").select("*").eq("id", networkId).single();
        if (!networkDb) throw new Error("Could not find selected network information in DB.");
        
        const chainConfig = findChainByChainId(networkDb.chain_id);

        // Check cache unless forcing refresh
        if (!forceRefresh) {
            const cached = await getCachedToken(contractAddress, networkDb.chain_id);
            if (cached) {
                const age = Date.now() - new Date(cached.fetched_at).getTime();
                if (age < CACHE_TTL) {
                    return {
                        status: "success",
                        metadata: {
                            name: cached.token_details.name,
                            symbol: cached.token_details.symbol,
                            decimals: cached.token_details.decimals,
                            logoUrl: cached.logo_url,
                            source: cached.source,
                        },
                        networkId,
                        contractAddress,
                    };
                }
            }
        }
        
        let metadata: Partial<TokenFetchResult> | null = await fetchFromExplorer(contractAddress, chainConfig.name);
        
        if (!metadata || !metadata.symbol) {
             if (chainConfig.rpc) {
                metadata = await fetchFromRpc(contractAddress, chainConfig.rpc);
             }
        }
        
        if (!metadata || !metadata.symbol || !metadata.name || metadata.decimals === undefined || metadata.decimals === null) {
            throw new Error("Could not fetch complete token metadata from explorer or RPC.");
        }
        
        const logoUrl = await fetchLogoFromCoinGecko(contractAddress, metadata.symbol, chainConfig);

        const result: TokenFetchResult = {
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            logoUrl: logoUrl,
            source: metadata.source || 'unknown',
        };
        
        return { 
            status: "success", 
            metadata: result, 
            networkId, 
            contractAddress 
        };

    } catch (e: any) {
        return { status: "error", message: e.message, networkId, contractAddress };
    }
}

    