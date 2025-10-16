
"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { ApiKey, Token, Network } from "@/lib/types";
import { PlaceHolderImages } from "./placeholder-images";
import { randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


// Note: Using the service_role key should only be done in server-side environments.
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

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
  logo: z.instanceof(File).refine((file) => file.size > 0, "Logo image is required."),
  contract: z.string().min(1, "Contract address is required."),
});

export async function addToken(
  prevState: AddTokenState,
  formData: FormData
): Promise<AddTokenState> {
    if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

  const validated = addTokenSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }
  
  const { logo, symbol, networkId, contract, ...tokenData } = validated.data;
  
  try {
    const fileContents = await logo.arrayBuffer();
    // Using networkId + contract address for a unique path
    const filePath = `logos/${networkId}-${contract}.${logo.name.split('.').pop()}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("logos")
      .upload(filePath, fileContents, {
        contentType: logo.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("logos")
      .getPublicUrl(filePath);

    if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded logo.");
    }
    
    const dbData = {
      ...tokenData,
      symbol: symbol.toUpperCase(),
      logo_url: publicUrlData.publicUrl,
      network_id: networkId,
      contract: contract,
      updated_at: new Date().toISOString(),
    };
    
    // Upsert based on networkId AND contract address.
    const { data: existingToken, error: fetchError } = await supabaseAdmin
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
    return { status: "success", message };

  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}

// --- API Key Management ---

export async function getApiKeys(): Promise<ApiKey[]> {
  if (!supabaseAdmin) return [];
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
  if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

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
   if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

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
  if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

  // Optional: Also delete the logo from storage
  const { data: token } = await supabaseAdmin
    .from("tokens")
    .select("logo_url")
    .eq("id", tokenId)
    .single();

  if (token && token.logo_url && !token.logo_url.includes('picsum.photos')) {
    try {
      // This logic is fragile, depends on the exact storage URL structure
      const path = new URL(token.logo_url).pathname.split('/public/logos/')[1];
      if (path) {
        await supabaseAdmin.storage.from("logos").remove([path]);
      }
    } catch (e) {
      // If parsing or deleting fails, log it but don't block the DB deletion
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
  if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

  const validated = searchTokenSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Token symbol is required." };
  }
  
  const { tokenSymbol } = validated.data;

  try {
    const { data, error } = await supabaseAdmin
      .from("tokens")
      .select("*")
      .eq("symbol", tokenSymbol.toUpperCase())
      .limit(1) // Just get one for the card display
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
  explorer_api_key_env_var: z.string().min(1, "ENV variable name is required."),
});

export async function addNetwork(prevState: AddNetworkState, formData: FormData): Promise<AddNetworkState> {
  if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }
  
  const validated = addNetworkSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }

  try {
    const { error } = await supabaseAdmin.from("networks").insert(validated.data);
    if (error) {
      // Handle potential unique constraint violation, etc.
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
  if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

  // We should also delete tokens associated with this network, this needs a proper CASCADE setup in the DB
  // For now, we just delete the network
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
  return { status: "success", message: "Network deleted." };
}
