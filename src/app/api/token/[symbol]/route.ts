
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const defaultLogo = PlaceHolderImages.find(
  (img) => img.id === "default-token-logo"
)!;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const isValidApiKey = async (apiKey: string): Promise<boolean> => {
    if (!supabaseUrl || !supabaseServiceKey) return false;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id')
      .eq('key', apiKey)
      .single();
    return !error && !!data;
}


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
  
  const requestApiKey = request.headers.get('x-api-key');

  if (!requestApiKey || !(await isValidApiKey(requestApiKey))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenSymbol = params.symbol;
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get('chain');


  if (!tokenSymbol) {
    return NextResponse.json(
      { error: "Token symbol is required." },
      { status: 400 }
    );
  }

  try {
    let query = supabase
      .from("tokens")
      .select("name, symbol, decimals, chain, logo_url, contract")
      .eq("symbol", tokenSymbol.toUpperCase());
    
    if (chain) {
      query = query.eq('chain', chain.toLowerCase());
    }
      
    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
       if (error && error.code !== "PGRST116") { // PGRST116 means no rows found, which is not an error here
         console.error("Supabase error:", error.message);
         throw error;
       }
      
      // Token not found, return default response
      return NextResponse.json({
        symbol: tokenSymbol.toUpperCase(),
        name: "Unknown Token",
        decimals: 0,
        chain: chain || 'unknown',
        logo_url: defaultLogo.imageUrl,
      });
    }

    // Return found token
    return NextResponse.json(data);

  } catch (e: any) {
     console.error("API route error:", e.message);
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}
