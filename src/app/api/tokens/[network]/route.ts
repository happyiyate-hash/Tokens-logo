
import { NextResponse } from "next/server";
import { isValidApiKey } from "@/lib/api-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * A robust, centralized function to find the best available logo for a token symbol.
 * This is a self-contained version for use within this API route.
 */
async function getLogoUrlBySymbol(symbol: string, networkName?: string): Promise<string | null> {
    if (!symbol) return null;
    const upperCaseSymbol = symbol.toUpperCase();

    // 1. Prioritize a direct match in token_metadata for the specific network if provided.
    if (networkName) {
        const { data: specificToken } = await supabaseAdmin
            .from("token_metadata")
            .select("logo_url")
            .eq("network", networkName.toLowerCase())
            .ilike("token_details->>symbol", upperCaseSymbol)
            .neq("logo_url", null)
            .limit(1)
            .maybeSingle();

        if (specificToken?.logo_url) {
            return specificToken.logo_url;
        }
    }

    // 2. Fallback to the global token_logos table for a generic symbol match.
    const { data: globalLogo } = await supabaseAdmin
        .from("token_logos")
        .select("public_url")
        .eq("symbol", upperCaseSymbol)
        .limit(1)
        .maybeSingle();
        
    return globalLogo?.public_url || null;
}

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
      
      // Use the robust centralized function to get the best logo URL
      const logoUrl = await getLogoUrlBySymbol(data.token_details.symbol, data.network);

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
          // Use the robust centralized function to find the best logo for each token
          const logoUrl = await getLogoUrlBySymbol(token.token_details.symbol, token.network);
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
