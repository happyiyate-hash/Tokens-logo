
"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { ApiKey, Token, Network, TokenMetadata } from "@/lib/types";
import { PlaceHolderImages } from "./placeholder-images";
import { randomBytes } from 'crypto';
import { autoFetchMissingLogo } from "@/ai/flows/auto-fetch-missing-logos";
import chainsConfig from "@/lib/chains.json";

// Consistent server-side Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const defaultLogo = PlaceHolderImages.find(
  (img) => img.id === "default-token-logo"
)!;

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
  logo_url: z.string().optional(), // Can come from the fetch step
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
        // Use the logo URL fetched from CoinGecko in the previous step
        finalLogoUrl = logo_url;
    }
    else {
        // Fallback if no logo was uploaded and none was found
        const result = await autoFetchMissingLogo({ tokenSymbol: symbol });
        if (result.logoUrl) {
          finalLogoUrl = result.logoUrl;
        } else {
          finalLogoUrl = defaultLogo.imageUrl;
        }
    }
    
    const dbData = {
      ...tokenData,
      symbol: symbol.toUpperCase(),
      logo_url: finalLogoUrl,
      network_id: networkId,
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
  // With CASCADE configured in the database, this will also delete associated tokens.
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

// --- Universal Token Data Fetcher ---

/**
 * Fetches a token's logo from CoinGecko.
 * A real implementation would cache this in a Supabase table.
 */
async function fetchTokenLogo(symbol: string): Promise<string | null> {
  if (!symbol) return null;
  const coingeckoApiUrl = process.env.COINGECKO_API_URL;
  if (!coingeckoApiUrl) {
    console.warn("COINGECKO_API_URL is not set. Skipping logo fetch.");
    return null;
  }
  
  try {
    const searchUrl = `${coingeckoApiUrl}/search?query=${symbol}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.error(`CoinGecko search failed with status ${searchRes.status}`);
      return null;
    }
    const searchData = await searchRes.json();
    const match = searchData.coins?.find((c: any) => c.symbol.toLowerCase() === symbol.toLowerCase());
    
    return match?.thumb || null;
  } catch (e: any) {
    console.error("Error fetching from CoinGecko:", e.message);
    return null;
  }
}


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

export async function fetchTokenMetadata(prevState: FetchMetadataState, formData: FormData): Promise<FetchMetadataState> {
  const validated = fetchMetadataSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Both contract address and network are required." };
  }

  const { contractAddress, networkId } = validated.data;

  try {
    const { data: network, error: networkError } = await supabaseAdmin
      .from("networks")
      .select("explorer_api_base_url, explorer_api_key_env_var")
      .eq("id", networkId)
      .single();
    
    if (networkError || !network) throw new Error("Could not find selected network information.");
    
    const apiKey = network.explorer_api_key_env_var ? process.env[network.explorer_api_key_env_var] : null;
    if (network.explorer_api_key_env_var && !apiKey) {
      console.warn(`API key environment variable '${network.explorer_api_key_env_var}' is not set.`);
    }

    const endpoint = `${network.explorer_api_base_url}?module=token&action=tokeninfo&contractaddress=${contractAddress}${apiKey ? `&apikey=${apiKey}` : ''}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) throw new Error(`Explorer API request failed with status ${response.status}.`);

    const result = await response.json();
    
    if (result.status === "0" || !result.result || result.result.length === 0) {
        throw new Error(`Explorer API Error: ${result.message} - ${result.result || 'No data found.'}`);
    }

    const tokenDetails = result.result[0];

    const metadata: TokenMetadata = {
        name: tokenDetails.tokenName || 'Unknown Token',
        symbol: tokenDetails.symbol || '???',
        decimals: parseInt(tokenDetails.decimals, 10),
    };

    // Now fetch the logo
    const logoUrl = await fetchTokenLogo(metadata.symbol);

    return { status: "success", metadata: { ...metadata, logoUrl }, networkId, contractAddress };

  } catch (e: any) {
    return { status: "error", message: e.message, networkId, contractAddress };
  }
}
