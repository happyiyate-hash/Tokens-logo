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
  chains: z.string().optional(), // Comma-separated string of chains
  decimals: z.coerce.number().int().min(0, "Decimals must be a positive integer."),
  logo: z.instanceof(File).refine((file) => file.size > 0, "Logo image is required."),
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
  
  const { logo, symbol, chains, ...tokenData } = validated.data;
  const chainsArray = chains ? chains.split(',').map(c => c.trim().toLowerCase()) : [];

  try {
    const fileContents = await logo.arrayBuffer();
    const filePath = `logos/${symbol.toLowerCase()}.${logo.name.split('.').pop()}`;

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
      chains: chainsArray,
      updated_at: new Date().toISOString(),
    };
    
    // Upsert metadata into Supabase DB
    const { error: upsertError } = await supabaseAdmin.from("tokens").upsert(
      dbData,
      { onConflict: 'symbol' }
    );

    if (upsertError) {
      throw new Error(`Database error: ${upsertError.message}`);
    }
    
    revalidatePath("/tokens");
    revalidatePath("/upload-token");
    return { status: "success", message: `${symbol.toUpperCase()} added or updated successfully!` };

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

  const newApiKey = `dcdn_${randomBytes(32).toString('hex')}`;

  const { error } = await supabaseAdmin
    .from('api_keys')
    .insert({ name: validated.data.name, key: newApiKey });

  if (error) {
    return { status: "error", message: `Failed to generate key: ${error.message}` };
  }
  
  revalidatePath('/api-keys');
  return { status: "success", message: "API Key generated successfully." };
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

  if (token && token.logo_url) {
    const path = new URL(token.logo_url).pathname.split("/logos/")[1];
    if (path) {
      await supabaseAdmin.storage.from("logos").remove([`logos/${path}`]);
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