
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
    
    // 1. Validate API Key
    if (!await isValidApiKey(clientKey)) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
    }

    if (!network) {
      return NextResponse.json({ error: "Network parameter is required." }, { status: 400 });
    }

    // 2. Handle single token fetch vs. all tokens for a network
    if (symbol) {
      // --- Fetch a single token by symbol ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, logo_url, contract_address, network")
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
        network: data.network,
        contract: data.contract_address,
        logo: data.logo_url,
      };

      return NextResponse.json(response);

    } else {
      // --- Fetch all tokens for the network ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, logo_url, contract_address, network")
        .eq("network", network.toLowerCase());

      if (error) throw error;

      const tokens = (data || []).map(token => ({
          symbol: token.token_details.symbol,
          name: token.token_details.name,
          decimals: token.token_details.decimals,
          network: token.network,
          contract: token.contract_address,
          logo: token.logo_url || null,
      }));

      return NextResponse.json(tokens);
    }

  } catch (err: any) {
    console.error("Error fetching token(s):", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

    