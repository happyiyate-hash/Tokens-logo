
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

    // --- Helper to get logo URL ---
    const getLogoUrl = async (tokenSymbol: string) => {
        const { data: logoData } = await supabaseAdmin
            .from('token_logos')
            .select('public_url') // CORRECTED COLUMN NAME
            .eq('symbol', tokenSymbol.toUpperCase())
            .single();
        return logoData?.public_url || null; // CORRECTED FIELD
    };

    // 2. Handle single token fetch vs. all tokens for a network
    if (symbol) {
      // --- Fetch a single token by symbol ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, contract_address, network")
        .eq("network", network.toLowerCase())
        .ilike("token_details->>symbol", symbol)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Token not found" }, { status: 404 });

      // The logo_url in token_metadata is already denormalized and correct.
      // We only need the helper for joins, which we are not doing here.
      const logoUrl = data.token_details.logo_url || await getLogoUrl(data.token_details.symbol);

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
        .select("token_details, contract_address, network, logo_url") // Select logo_url directly
        .eq("network", network.toLowerCase());

      if (error) throw error;

      const tokens = await Promise.all((data || []).map(async (token) => {
          // Use the directly selected logo_url, fall back to querying token_logos only if needed
          const logoUrl = token.logo_url || await getLogoUrl(token.token_details.symbol);
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
