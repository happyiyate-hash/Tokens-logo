
import { NextResponse } from "next/server";
import { isValidApiKey } from "@/lib/api-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: { network: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const network = params.network;
    const clientKey = request.headers.get("x-api-key");
    
    const client = await isValidApiKey(clientKey);
    if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
    }

    if (!network) {
      return NextResponse.json({ error: "Network parameter is required." }, { status: 400 });
    }

    // --- Helper to get logo URL by symbol (fallback) ---
    const getGlobalLogoBySymbol = async (tokenSymbol: string) => {
        const { data: logoData } = await supabaseAdmin
            .from('token_logos')
            .select('public_url')
            .eq('symbol', tokenSymbol.toUpperCase())
            .limit(1)
            .maybeSingle();
        return logoData?.public_url || null;
    };

    if (symbol) {
      // --- Fetch a single token by symbol on a specific network ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, contract_address, network, logo_url")
        .eq("network", network.toLowerCase())
        .ilike("token_details->>symbol", symbol)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Token not found" }, { status: 404 });
      
      // Use the specific logo_url from the metadata if it exists, otherwise fall back to the global logo.
      const logoUrl = data.logo_url || await getGlobalLogoBySymbol(data.token_details.symbol);

      const response = {
        success: true,
        symbol: data.token_details.symbol,
        name: data.token_details.name,
        decimals: data.token_details.decimals,
        network: data.network,
        contract: data.contract_address,
        logo_url: logoUrl,
      };

      await supabaseAdmin.from("api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", client.id);
      return NextResponse.json(response);

    } else {
      // --- Fetch all tokens for the network ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, contract_address, network, logo_url")
        .eq("network", network.toLowerCase());

      if (error) throw error;

      const tokens = await Promise.all((data || []).map(async (token) => {
          // Use the specific logo_url, fall back to querying the global token_logos table if needed
          const logoUrl = token.logo_url || await getGlobalLogoBySymbol(token.token_details.symbol);
          return {
              symbol: token.token_details.symbol,
              name: token.token_details.name,
              decimals: token.token_details.decimals,
              network: token.network,
              contract: token.contract_address,
              logo_url: logoUrl,
          };
      }));
      
      await supabaseAdmin.from("api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", client.id);
      return NextResponse.json(tokens);
    }

  } catch (err: any) {
    console.error("Error fetching token(s):", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
