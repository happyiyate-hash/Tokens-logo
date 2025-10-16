"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Token } from "@/lib/types";
import { autoFetchMissingLogo } from "@/ai/flows/auto-fetch-missing-logos";
import { PlaceHolderImages } from "./placeholder-images";
import { randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    
    revalidatePath("/");
    return { status: "success", message: `${symbol.toUpperCase()} added or updated successfully!` };

  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}

// --- API Key Management ---

export async function getApiKey(): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'api_key')
    .single();

  if (error || !data) {
    return null;
  }
  return data.value;
}

export type GenerateApiKeyState = {
  status: "idle" | "success" | "error";
  apiKey?: string | null;
  message?: string;
};

export async function generateNewApiKey(
  prevState: GenerateApiKeyState
): Promise<GenerateApiKeyState> {
  if (!supabaseAdmin) {
    return { status: "error", message: "Supabase connection not configured." };
  }

  const newApiKey = randomBytes(32).toString('hex');

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert({ key: 'api_key', value: newApiKey }, { onConflict: 'key' });

  if (error) {
    return { status: "error", message: `Failed to generate key: ${error.message}` };
  }
  
  revalidatePath('/settings');
  return { status: "success", apiKey: newApiKey };
}
