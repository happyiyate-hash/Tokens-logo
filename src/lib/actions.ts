
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ApiKey, TokenFetchResult, TokenDetails, TokenMetadata, TokenLogo } from "@/lib/types";
import chainsConfig from "@/lib/chains.json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchTokenMetadataFromSources } from "@/lib/fetchers";
import axios from 'axios';
import { autoFetchMissingLogo } from '@/ai/flows/auto-fetch-missing-logos';

const STORAGE_BUCKET = "token_logos";
const CACHE_TTL = Number(process.env.CACHE_TTL_MS || 7 * 24 * 3600 * 1000);


// --- Uploader for Global Logos ---

export type AddGlobalLogoState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addGlobalLogoSchema = z.object({
  symbol: z.string().min(1, "Token symbol is required."),
  name: z.string().optional(),
  logoFile: z.instanceof(File).refine(file => file.size > 0, 'Logo file is required.'),
});

export async function addGlobalLogo(
  prevState: AddGlobalLogoState,
  formData: FormData
): Promise<AddGlobalLogoState> {
  const logoFileValue = formData.get('logo');
  const validated = addGlobalLogoSchema.safeParse({
      symbol: formData.get('symbol'),
      name: formData.get('name') || undefined,
      logoFile: logoFileValue instanceof File ? logoFileValue : undefined,
  });

  if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return { status: "error", message: firstError || "Invalid input." };
  }

  const { logoFile, symbol, name } = validated.data;
  const finalName = name || symbol; // Use symbol as name if name is not provided
  const upperCaseSymbol = symbol.toUpperCase();

  try {
      const fileContents = await logoFile.arrayBuffer();
      const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `global/${upperCaseSymbol.toLowerCase()}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileContents, { contentType: logoFile.type, upsert: true });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }
      
      const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const finalLogoUrl = publicUrlData.publicUrl;

      // New Strategy: Delete then Insert to bypass schema cache issues with upsert
      // 1. Delete any existing record for this symbol
      const { error: deleteError } = await supabaseAdmin
        .from('token_logos')
        .delete()
        .eq('symbol', upperCaseSymbol);

      // Ignore 'not found' errors on delete, but throw others
      if (deleteError && deleteError.code !== 'PGRST204') {
          throw new Error(`Database delete error: ${deleteError.message}`);
      }
      
      // 2. Insert the new record
      const { error: insertError } = await supabaseAdmin
        .from('token_logos')
        .insert({ 
            symbol: upperCaseSymbol, 
            name: finalName,
            logo_url: finalLogoUrl 
        });

      if (insertError) {
          throw new Error(`Database insert error: ${insertError.message}`);
      }

      revalidatePath("/tokens");
      revalidatePath("/upload-token");
      return { status: "success", message: `${upperCaseSymbol} global logo saved successfully!` };

  } catch (e: any) {
      console.error("[addGlobalLogo Error]", e);
      return { status: "error", message: e.message };
  }
}


// --- Add/Update Token ---

export type AddTokenState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addTokenSchema = z.object({
  name: z.string().min(1, "Token name is required."),
  symbol: z.string().min(1, "Token symbol is required."),
  chainId: z.string().min(1, "Chain ID is required."),
  decimals: z.coerce.number().int().min(0).default(18),
  logoFile: z.instanceof(File).optional(),
  logo_url: z.string().url().optional(),
  contract: z.string().min(1, "Contract address is required."),
});


async function uploadLogoFromUrl(url: string, symbol: string): Promise<string | null> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/png';
        const fileExtension = contentType.split('/')[1]?.split('+')[0] || 'png';
        const fileName = `${symbol.toLowerCase()}.${fileExtension}`;
        const filePath = `global/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, buffer, { contentType, upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);
        
        return publicUrlData.publicUrl;
    } catch (e: any) {
        console.error(`Failed to download and re-upload logo from ${url}: ${e.message}`);
        // Return original URL as a fallback if our ingestion fails.
        return url;
    }
}


export async function addToken(
  prevState: AddTokenState,
  formData: FormData
): Promise<AddTokenState> {
  const logoFileValue = formData.get('logo');
  const validated = addTokenSchema.safeParse({
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      chainId: formData.get('chainId'),
      decimals: formData.get('decimals'),
      logoFile: logoFileValue instanceof File && logoFileValue.size > 0 ? logoFileValue : undefined,
      logo_url: formData.get('logo_url'),
      contract: formData.get('contract'), 
  });

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }
  
  const { logoFile, symbol, name, decimals, chainId, contract } = validated.data;
  const logoUrlFromForm = formData.get('logo_url') as string | null;

  try {
    let finalLogoUrl: string | undefined = undefined;

    // Priority: 1. Uploaded file, 2. URL from AI/fetcher (which needs ingestion)
    if (logoFile) {
        const fileContents = await logoFile.arrayBuffer();
        const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const filePath = `global/${symbol.toLowerCase()}_${Date.now()}.${ext}`;

        const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(filePath, fileContents, { contentType: logoFile.type, upsert: true });
        if (error) throw new Error(`Storage upload error: ${error.message}`);
        
        const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
        finalLogoUrl = publicUrlData.publicUrl;

    } else if (logoUrlFromForm) {
        // If the URL is external (not from our Supabase), download and re-upload it.
        const supabaseStorageUrl = process.env.SUPABASE_URL || "";
        if (!logoUrlFromForm.startsWith(supabaseStorageUrl)) {
            const reuploadedUrl = await uploadLogoFromUrl(logoUrlFromForm, symbol);
            finalLogoUrl = reuploadedUrl ?? logoUrlFromForm; // Fallback to original URL if re-upload fails
        } else {
            // It's already in our storage, just use it.
            finalLogoUrl = logoUrlFromForm;
        }
    }

    if (!finalLogoUrl) {
       return { status: "error", message: "A logo image is required when creating a token." };
    }
    
    // Upsert into the global token_logos table if we have a logo
    if (finalLogoUrl) {
      const { error: logoUpsertError } = await supabaseAdmin
          .from('token_logos')
          .upsert({ 
              symbol: symbol.toUpperCase(), 
              name: name,
              logo_url: finalLogoUrl 
            }, { onConflict: 'symbol' });

      if (logoUpsertError) {
          throw new Error(`Database logo upsert error: ${logoUpsertError.message}`);
      }
    }

    // Save contract-specific metadata
    const chainConfig = chainsConfig.find(c => c.chainId.toString() === chainId);
    if (!chainConfig) throw new Error("Network not found for contract-specific metadata.");

    const tokenDetails: TokenDetails = { name, symbol, decimals, network: chainConfig.name.toLowerCase(), contract_address: contract.toLowerCase() };
    
    const { error: upsertError } = await supabaseAdmin
        .from("token_metadata")
        .upsert({ 
            contract_address: contract.toLowerCase(),
            network: chainConfig.name.toLowerCase(),
            token_details: tokenDetails,
            logo_url: finalLogoUrl, // Store denormalized URL for faster joins
            source: "manual",
            verified: true,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'contract_address, network' });

    if (upsertError) {
      throw new Error(`Database metadata upsert error: ${upsertError.message}`);
    }


    revalidatePath("/tokens");
    revalidatePath("/add-token");
    return { status: "success", message: `${symbol.toUpperCase()} token and metadata saved successfully!` };

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
    const { data: newKeyRecord, error } = await supabaseAdmin.rpc("generate_api_key", {
      p_client_name: validated.data.name,
    });
  
    if (error) {
      throw new Error(`Failed to generate key: ${error.message}`);
    }
    
    revalidatePath('/api-keys');
    return { status: "success", message: "API Key generated successfully.", newKey: newKeyRecord };
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
    // First, try to find a contract-specific token. We prioritize an exact symbol match.
    const { data, error } = await supabaseAdmin
      .from("token_metadata")
      .select("*, token_logos(logo_url)")
      .ilike("token_details->>symbol", tokenSymbol)
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      // @ts-ignore
      const finalData = { ...data, logo_url: data.token_logos?.logo_url || data.logo_url };
      return { status: "success", token: finalData };
    }
    
    // If not found, fall back to the global logos table.
    // Here we prioritize an exact match on symbol first.
    const { data: logoData, error: logoError } = await supabaseAdmin
      .from("token_logos")
      .select("symbol, name, logo_url")
      .eq("symbol", tokenSymbol.toUpperCase())
      .limit(1)
      .single();
    
    if (logoError || !logoData) {
      return { status: "error", message: `Token "${tokenSymbol}" not found in metadata or global logos.` };
    }
    
    // Construct a mock TokenMetadata object for display since it's a global logo
    const mockToken: TokenMetadata = {
      id: logoData.symbol,
      contract_address: 'N/A (Global Logo)',
      network: 'All',
      token_details: {
        name: logoData.name || logoData.symbol,
        symbol: logoData.symbol,
        decimals: 18, // Default decimals for display
        network: 'all',
        contract_address: ''
      },
      logo_key: null,
      logo_url: logoData.logo_url,
      verified: true,
      source: 'manual',
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return { status: "success", token: mockToken };
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
  chainId?: string;
  contractAddress?: string;
}

const fetchMetadataSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required."),
  chainId: z.string().min(1, "Please select a network."),
});

async function getCachedToken(contract: string, chainId: number): Promise<TokenMetadata | null> {
    const chainConfig = chainsConfig.find(c => c.chainId === chainId);
    if (!chainConfig) return null;
    
    const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("*, token_logos(logo_url)")
        .eq("contract_address", contract.toLowerCase())
        .eq("network", chainConfig.name.toLowerCase())
        .maybeSingle();
    
    if (error) {
        console.error("Error fetching cached token:", error);
        return null;
    };

    if (data) {
        // @ts-ignore
        data.logo_url = data.token_logos?.logo_url || data.logo_url;
    }

    return data;
}

async function findGlobalLogo(symbol: string): Promise<TokenLogo | null> {
    const { data, error } = await supabaseAdmin
        .from("token_logos")
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return data;
}

export async function fetchTokenMetadata(prevState: FetchMetadataState, formData: FormData): Promise<FetchMetadataState> {
    const validated = fetchMetadataSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validated.success) {
        return { status: "error", message: "Both contract address and network are required." };
    }

    const { contractAddress, chainId } = validated.data;
    const forceRefresh = formData.get("forceRefresh") === "true";
  
    try {
        const chainConfig = chainsConfig.find(c => c.chainId.toString() === chainId);
        if (!chainConfig) throw new Error(`Configuration for chainId ${chainId} not found.`);

        // Check for cached version first
        if (!forceRefresh) {
            const cached = await getCachedToken(contractAddress, chainConfig.chainId);
            if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL) {
                return {
                    status: "success",
                    metadata: { ...cached.token_details, logoUrl: cached.logo_url, source: cached.source },
                    chainId,
                    contractAddress,
                };
            }
        }
        
        // Fetch fresh metadata (Explorer first, then RPC fallback)
        const metadata = await fetchTokenMetadataFromSources(contractAddress, chainConfig.name);
        
        if (!metadata || !metadata.symbol || !metadata.name || metadata.decimals === undefined) {
            throw new Error("Could not fetch complete token metadata from any source.");
        }
        
        // Find logo: 1. Global DB, 2. AI Fetch (CoinGecko fallback)
        let logoUrl: string | null = (await findGlobalLogo(metadata.symbol))?.logo_url || null;
        if (!logoUrl) {
            const aiResult = await autoFetchMissingLogo({ 
                tokenSymbol: metadata.symbol,
                tokenName: metadata.name,
            });
            logoUrl = aiResult.logoUrl;
        }

        const result: TokenFetchResult = {
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            logoUrl: logoUrl,
            source: metadata.source || 'unknown',
        };
        
        return { status: "success", metadata: result, chainId, contractAddress };

    } catch (e: any) {
        return { status: "error", message: e.message, chainId, contractAddress };
    }
}

    