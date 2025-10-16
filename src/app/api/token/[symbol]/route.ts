
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Token } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { autoFetchMissingLogo } from "@/ai/flows/auto-fetch-missing-logos";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const defaultLogo = PlaceHolderImages.find(
  (img) => img.id === "default-token-logo"
)!;

// Note: Using the anon key is safe for client-side/public API access
// as long as you have Row Level Security (RLS) enabled on your tables.
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase connection not configured." },
      { status: 500 }
    );
  }

  // API Key check
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenSymbol = params.symbol;

  if (!tokenSymbol) {
    return NextResponse.json(
      { error: "Token symbol is required." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("tokens")
      .select("name, symbol, decimals, chains, logo_url")
      .eq("symbol", tokenSymbol.toUpperCase())
      .single();

    if (error || !data) {
      if (error && error.code !== "PGRST116") {
         console.error("Supabase error:", error.message);
         throw error;
      }
      
      // Token not found, return default response
      return NextResponse.json({
        symbol: tokenSymbol.toUpperCase(),
        name: "Unknown Token",
        decimals: 0,
        chains: [],
        logo_url: defaultLogo.imageUrl,
      });
    }

    const token: Partial<Token> = data;
    
    // If logo is missing, try to fetch it with AI
    if (!token.logo_url) {
      try {
        const { logoUrl } = await autoFetchMissingLogo({
          tokenSymbol: token.symbol!,
        });

        if (logoUrl) {
          token.logo_url = logoUrl;
           // Update the database in the background, don't block the response
          supabase
            .from('tokens')
            .update({ logo_url: logoUrl })
            .eq('symbol', token.symbol!)
            .then(({ error: updateError }) => {
              if (updateError) console.error("Failed to update logo_url:", updateError);
            });
        } else {
          token.logo_url = defaultLogo.imageUrl;
        }
      } catch (e) {
        console.error("AI logo fetch failed:", e);
        token.logo_url = defaultLogo.imageUrl;
      }
    }


    return NextResponse.json(token);

  } catch (e: any) {
     console.error("API route error:", e.message);
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}

