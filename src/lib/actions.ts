"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { ApiKey, Token } from "@/lib/types";
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
  chain: z.string().min(1, "Chain identifier is required."),
  decimals: z.coerce.number().int().min(0, "Decimals must be a positive integer."),
  logo: z.instanceof(File).refine((file) => file.size > 0, "Logo image is required."),
  contract: z.string().optional(),
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
  
  const { logo, symbol, chain, ...tokenData } = validated.data;
  
  try {
    const fileContents = await logo.arrayBuffer();
    // Using contract address + chain for a more unique path
    const uniquePart = tokenData.contract ? `${chain}-${tokenData.contract}` : `${chain}-${symbol.toLowerCase()}`;
    const filePath = `logos/${uniquePart}.${logo.name.split('.').pop()}`;

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
      chain: chain.trim().toLowerCase(),
      updated_at: new Date().toISOString(),
    };
    
    // Upsert based on symbol AND chain. This is a simplification.
    // A true robust solution would use contract address + chain_id.
    const { data: existingToken, error: fetchError } = await supabaseAdmin
      .from("tokens")
      .select('id')
      .eq('symbol', dbData.symbol)
      .eq('chain', dbData.chain)
      .single();

    let message;
    if (existingToken) {
       const { error: updateError } = await supabaseAdmin
        .from("tokens")
        .update({ ...dbData, id: undefined }) // id should not be in update payload
        .eq('id', existingToken.id);
       if (updateError) throw new Error(`Database error: ${updateError.message}`);
       message = `${symbol.toUpperCase()} on ${dbData.chain} updated successfully!`;
    } else {
        const { error: insertError } = await supabaseAdmin
        .from("tokens")
        .insert(dbData);
      if (insertError) throw new Error(`Database error: ${insertError.message}`);
       message = `${symbol.toUpperCase()} on ${dbData.chain} added successfully!`;
    }

    revalidatePath("/tokens");
    revalidatePath("/upload-token");
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

export type DeleteApiKeyState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function deleteApiKey(
  keyId: string,
): Promise<DeleteApiKeyState> {
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

export type DeleteTokenState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function deleteToken(tokenId: string): Promise<DeleteTokenState> {
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
