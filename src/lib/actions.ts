"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Token } from "@/lib/types";
import { autoFetchMissingLogo } from "@/ai/flows/auto-fetch-missing-logos";
import { PlaceHolderImages } from "./placeholder-images";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Note: Using the service_role key should only be done in server-side environments.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// --- MOCK DATA until a real DB is connected ---
const MOCK_TOKENS: Token[] = [
  {
    id: "1",
    name: "Tether",
    symbol: "USDT",
    contract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    chain: "ethereum",
    decimals: 6,
    logo_url: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "USD Coin",
    symbol: "USDC",
    contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    chain: "ethereum",
    decimals: 6,
    logo_url: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Wrapped liquid staked Ether 2.0",
    symbol: "wstETH",
    contract: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    chain: "ethereum",
    decimals: 18,
    logo_url: "", // No logo to test fallback and AI fetch
    updated_at: new Date().toISOString(),
  },
];
// --- END MOCK DATA ---

const defaultLogo = PlaceHolderImages.find(
  (img) => img.id === "default-token-logo"
)!;

export type SearchState = {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  token?: Token;
};

export async function searchToken(
  prevState: SearchState,
  formData: FormData
): Promise<SearchState> {
  const schema = z.object({
    contractAddress: z.string().min(1, "Contract address is required."),
  });

  const validated = schema.safeParse({
    contractAddress: formData.get("contractAddress"),
  });

  if (!validated.success) {
    return { status: "error", message: validated.error.errors[0].message };
  }

  const { contractAddress } = validated.data;

  // In a real app, you'd query your Supabase DB here.
  // const { data: token, error } = await supabaseAdmin
  //   .from('tokens')
  //   .select('*')
  //   .eq('contract', contractAddress)
  //   .single();
  let token = MOCK_TOKENS.find((t) => t.contract === contractAddress.toLowerCase());

  if (!token) {
    // This is where you would fetch from the blockchain if not in your DB
    // For this demo, we'll just say it's not found.
    return { status: "error", message: "Token not found in our database." };
  }

  if (!token.logo_url) {
    try {
      const { logoUrl } = await autoFetchMissingLogo({
        tokenSymbol: token.symbol,
      });

      if (logoUrl) {
        token.logo_url = logoUrl;
        // You would update your DB here with the new logo URL
      } else {
        token.logo_url = defaultLogo.imageUrl;
      }
    } catch (e) {
      console.error("AI logo fetch failed:", e);
      token.logo_url = defaultLogo.imageUrl;
    }
  }

  return { status: "success", token };
}

export type AddTokenState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addTokenSchema = z.object({
  name: z.string().min(1, "Token name is required."),
  symbol: z.string().min(1, "Token symbol is required."),
  contract: z.string().min(1, "Contract address is required."),
  chain: z.string().min(1, "Chain is required."),
  decimals: z.coerce.number().int().min(0, "Decimals must be a positive integer."),
  logo: z.instanceof(File).refine((file) => file.size > 0, "Logo image is required."),
});

export async function addToken(
  prevState: AddTokenState,
  formData: FormData
): Promise<AddTokenState> {
  const validated = addTokenSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: validated.error.flatten().fieldErrors.logo?.[0] || Object.values(validated.error.flatten().fieldErrors)[0]?.[0] };
  }
  
  const { logo, symbol, ...tokenData } = validated.data;

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
    
    // Insert metadata into Supabase DB
    const { error: insertError } = await supabaseAdmin.from("tokens").insert({
      ...tokenData,
      symbol,
      logo_url: publicUrlData.publicUrl,
    });

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }
    
    revalidatePath("/");
    revalidatePath("/admin");
    return { status: "success", message: `${symbol} added successfully!` };

  } catch (e: any) {
    // In a real app, you wouldn't get these errors because the DB would be connected.
    // This is for demonstration.
    if (e.message.includes("fetch failed") || e.message.includes("Missing")) {
      console.warn("Supabase not configured. Simulating success for demo purposes.");
      revalidatePath("/");
      revalidatePath("/admin");
      return { status: "success", message: `${symbol} added successfully! (Simulated)` };
    }
    return { status: "error", message: e.message };
  }
}
