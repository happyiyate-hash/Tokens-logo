
"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { ApiKey, Token, Network, TokenMetadata } from "@/lib/types";
import { PlaceHolderImages } from "./placeholder-images";
import { randomBytes } from 'crypto';
import { autoFetchMissingLogo } from "@/ai/flows/auto-fetch-missing-logos";
import chainsConfig from "@/lib/chains.json";
import { ethers } from "ethers";

// Consistent server-side Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINGECKO_API_URL = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";

const defaultLogo = PlaceHolderImages.find(
  (img) => img.id === "default-token-logo"
)!;

// --- ERC20 ABI for RPC fallback ---
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// --- Add/Update Token ---

export type AddTokenState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addTokenSchema = z.object({
  name: z.string().min(1, "Token name is required."),
  symbol: z.string().min(1, "Token symbol is required."),
  networkId: z.string().min(1, "Network ID is required."),
  decimals: z.coerce.number().int().min(0, "Decimals must be a positive integer."),
  logo: z.instanceof(File).optional(),
  logo_url: z.string().optional(),
  contract: z.string().min(1, "Contract address is required."),
});

export async function addToken(
  prevState: AddTokenState,
  formData: FormData
): Promise<AddTokenState> {
  const validated = addTokenSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }
  
  const { logo, symbol, networkId, contract, logo_url, ...tokenData } = validated.data;
  let finalLogoUrl = "";
  
  try {
    if (logo && logo.size > 0) {
        const fileContents = await logo.arrayBuffer();
        const filePath = `logos/${networkId}-${contract}.${logo.name.split('.').pop()}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("logos")
          .upload(filePath, fileContents, {
            contentType: logo.type,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Storage error: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("logos")
          .getPublicUrl(filePath);

        if (!publicUrlData) {
          throw new Error("Could not get public URL for the uploaded logo.");
        }
        finalLogoUrl = publicUrlData.publicUrl;
    } else if (logo_url) {
        finalLogoUrl = logo_url;
    }
    else {
        const result = await autoFetchMissingLogo({ tokenSymbol: symbol });
        if (result.logoUrl) {
          finalLogoUrl = result.logoUrl;
        } else {
          finalLogoUrl = defaultLogo.imageUrl;
        }
    }
    
    const { data: network } = await supabaseAdmin.from("networks").select('id').eq('id', networkId).single();
    if (!network) throw new Error("Network not found.");

    const dbData = {
      ...tokenData,
      symbol: symbol.toUpperCase(),
      logo_url: finalLogoUrl,
      network_id: network.id,
      contract: contract,
      updated_at: new Date().toISOString(),
    };
    
    const { data: existingToken } = await supabaseAdmin
      .from("tokens")
      .select('id')
      .eq('network_id', dbData.network_id)
      .eq('contract', dbData.contract)
      .single();

    let message;
    if (existingToken) {
       const { error: updateError } = await supabaseAdmin
        .from("tokens")
        .update(dbData)
        .eq('id', existingToken.id);
       if (updateError) throw new Error(`Database error: ${updateError.message}`);
       message = `${symbol.toUpperCase()} on network updated successfully!`;
    } else {
        const { error: insertError } = await supabaseAdmin
        .from("tokens")
        .insert(dbData);
      if (insertError) throw new Error(`Database error: ${insertError.message}`);
       message = `${symbol.toUpperCase()} added successfully!`;
    }

    revalidatePath("/tokens");
    revalidatePath("/add-token");
    return { status: "success", message };

  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}

// --- API Key Management ---

export async function getApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
  return data;
}

export type GenerateApiKeyState = {
  status: "idle" | "success" | "error";
  message?: string;
  newKey?: ApiKey;
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

  const newApiKeyString = `dcdn_${randomBytes(24).toString('hex')}`;
  const keyData = { name: validated.data.name, key: newApiKeyString };

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert(keyData)
    .select()
    .single();

  if (error) {
    return { status: "error", message: `Failed to generate key: ${error.message}` };
  }
  
  revalidatePath('/api-keys');
  return { status: "success", message: "API Key generated successfully.", newKey: data };
}

export async function deleteApiKey(
  keyId: string,
): Promise<{ status: "success" | "error", message: string }> {
  const { error } = await supabaseAdmin
    .from('api_keys')
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
    .from("tokens")
    .select("logo_url")
    .eq("id", tokenId)
    .single();

  if (token && token.logo_url && !token.logo_url.includes('picsum.photos') && supabaseUrl && token.logo_url.includes(supabaseUrl)) {
    try {
      const path = new URL(token.logo_url).pathname.split('/public/logos/')[1];
      if (path) {
        await supabaseAdmin.storage.from("logos").remove([path]);
      }
    } catch (e) {
      console.error("Could not parse or delete storage object for logo_url:", token.logo_url, e);
    }
  }

  const { error } = await supabaseAdmin
    .from("tokens")
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
  token?: Token;
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
      .from("tokens")
      .select("*, networks(*)")
      .ilike("symbol", tokenSymbol)
      .limit(1)
      .single();

    if (error || !data) {
      return { status: "error", message: `Token "${tokenSymbol}" not found.` };
    }
    
    const resultToken: Token = {
      id: data.id,
      network_id: data.network_id,
      name: data.name,
      symbol: data.symbol,
      decimals: data.decimals,
      logo_url: data.logo_url,
      contract: data.contract,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { status: "success", token: resultToken };
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
  explorer_api_key_env_var: z.string().optional(),
});

export async function addNetwork(prevState: AddNetworkState, formData: FormData): Promise<AddNetworkState> {
  const validated = addNetworkSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }

  try {
    const { error } = await supabaseAdmin.from("networks").insert(validated.data);
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
  metadata?: TokenMetadata & { logoUrl?: string | null };
  networkId?: string;
  contractAddress?: string;
}

const fetchMetadataSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required."),
  networkId: z.string().min(1, "Please select a network."),
});

async function fetchFromExplorer(contract: string, chain: any): Promise<TokenMetadata | null> {
  if (!chain.api) return null;
  try {
    const url = `${chain.api}?module=token&action=tokeninfo&contractaddress=${contract}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.status === "0" || !data.result || data.result.length === 0) {
      return null;
    }
    const token = data.result[0];
    return {
      name: token.tokenName || token.name || "",
      symbol: token.symbol || "",
      decimals: token.decimals ? parseInt(token.decimals, 10) : 18,
    };
  } catch (e) {
    return null;
  }
}

async function fetchFromRpc(contract: string, chain: any): Promise<TokenMetadata | null> {
  if (!chain.rpc) return null;
  try {
    const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
    const tokenContract = new ethers.Contract(contract, ERC20_ABI, provider);

    const [name, symbol, decimals] = await Promise.allSettled([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return {
      name: name.status === "fulfilled" ? name.value : "",
      symbol: symbol.status === "fulfilled" ? symbol.value : "",
      decimals: decimals.status === "fulfilled" ? decimals.value : 18,
    };
  } catch (err) {
    return null;
  }
}

async function fetchLogoFromCoinGecko(contractAddress: string, symbol: string, chain: any): Promise<string | null> {
  // 1. Try platform-specific endpoint first
  if (chain.cgPlatform) {
    try {
      const url = `${COINGECKO_API_URL}/coins/${chain.cgPlatform}/contract/${contractAddress.toLowerCase()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data?.image?.large) return data.image.large;
      }
    } catch (e) {
      // Ignore error and fall through
    }
  }

  // 2. Fallback to symbol search
  if (symbol) {
    try {
      const url = `${COINGECKO_API_URL}/search?query=${encodeURIComponent(symbol)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const match = data.coins?.find((c: any) => c.symbol.toLowerCase() === symbol.toLowerCase());
        return match?.large || match?.thumb || null;
      }
    } catch (e) {
        // Ignore error
    }
  }
  
  return null;
}

export async function fetchTokenMetadata(prevState: FetchMetadataState, formData: FormData): Promise<FetchMetadataState> {
  const validated = fetchMetadataSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Both contract address and network are required." };
  }

  const { contractAddress, networkId } = validated.data;
  
  try {
    const { data: networkDb } = await supabaseAdmin.from("networks").select("*").eq("id", networkId).single();
    if (!networkDb) throw new Error("Could not find selected network information in DB.");
    
    // Find the chain config from the JSON file
    const chainConfig = chainsConfig.chains.find(c => c.chainId === networkDb.chain_id);
    if (!chainConfig) throw new Error("Could not find chain configuration in chains.json.");

    // 1. Fetch metadata (Explorer -> RPC fallback)
    let metadata: TokenMetadata | null = await fetchFromExplorer(contractAddress, chainConfig);
    if (!metadata || !metadata.symbol) {
      metadata = await fetchFromRpc(contractAddress, chainConfig);
    }
    
    if (!metadata || !metadata.symbol) {
      throw new Error("Could not fetch token metadata from explorer or RPC.");
    }
    
    // 2. Fetch logo
    const logoUrl = await fetchLogoFromCoinGecko(contractAddress, metadata.symbol, chainConfig);

    return { status: "success", metadata: { ...metadata, logoUrl }, networkId, contractAddress };

  } catch (e: any) {
    return { status: "error", message: e.message, networkId, contractAddress };
  }
}

    