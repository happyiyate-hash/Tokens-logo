
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (private, server-only)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { network: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const network = params.network;
    const clientKey = request.headers.get("x-api-key");
    
    // 1. Validate API Key
    if (clientKey !== process.env.PUBLIC_API_KEY) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
    }

    if (!network) {
      return NextResponse.json({ error: "Network parameter is required." }, { status: 400 });
    }

    // 2. Handle single token fetch vs. all tokens for a network
    if (symbol) {
      // --- Fetch a single token by symbol ---
      const { data, error } = await supabase
        .from("token_metadata")
        .select("token_details, logo_url")
        .eq("network", network.toLowerCase())
        .ilike("token_details->>symbol", symbol)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Token not found" }, { status: 404 });

      const response = {
        success: true,
        symbol: data.token_details.symbol,
        name: data.token_details.name,
        decimals: data.token_details.decimals,
        network: data.token_details.network,
        contract: data.token_details.contract_address,
        logo: data.logo_url,
      };

      return NextResponse.json(response);

    } else {
      // --- Fetch all tokens for the network ---
      const { data, error } = await supabase
        .from("token_metadata")
        .select("token_details, logo_url, contract_address, network, fetched_at, updated_at, verified, source")
        .eq("network", network.toLowerCase());

      if (error) throw error;

      const response = (data || []).map(token => ({
          contract_address: token.contract_address,
          network: token.network,
          token_details: token.token_details,
          logo_url: token.logo_url || null,
          verified: token.verified,
          source: token.source,
          fetched_at: token.fetched_at,
          updated_at: token.updated_at,
      }));

      return NextResponse.json(response);
    }

  } catch (err: any) {
    console.error("Error fetching token:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
