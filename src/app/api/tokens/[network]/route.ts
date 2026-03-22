
import { NextResponse } from "next/server";
import { isValidApiKey } from "@/lib/api-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import chainsConfig from "@/lib/chains.json";

interface ChainConfig {
    name: string;
    alias?: string;
    chainId: number;
    explorerApi: string;
    rpc: string;
    cgPlatform: string;
    nativeCurrencySymbol: string;
}

const typedChainsConfig: ChainConfig[] = chainsConfig;


export async function GET(
  request: Request,
  { params }: { params: { network: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const requestedNetworkIdentifier = params.network;
    const clientKey = request.headers.get("x-api-key");
    
    const client = await isValidApiKey(clientKey);
    if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
    }

    if (!requestedNetworkIdentifier) {
      return NextResponse.json({ error: "Network parameter is required." }, { status: 400 });
    }
    
    // New logic: Find the official network name from the identifier (full name or alias)
    const lowercasedIdentifier = requestedNetworkIdentifier.toLowerCase();
    const networkConfig = typedChainsConfig.find(c => 
        c.name.toLowerCase() === lowercasedIdentifier || 
        (c.alias && c.alias.toLowerCase() === lowercasedIdentifier)
    );

    if (!networkConfig) {
        return NextResponse.json({ error: `Network '${requestedNetworkIdentifier}' not found or not supported.` }, { status: 404 });
    }
    
    // Use the official, full network name for all subsequent database queries
    const officialNetworkName = networkConfig.name.toLowerCase();


    if (symbol) {
      // --- Fetch a single token by symbol on a specific network ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, contract_address, network, logo_url")
        .eq("network", officialNetworkName)
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
        logo_url: data.logo_url, // The logo_url is already linked and stored.
      };

      await supabaseAdmin.from("api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", client.id);
      return NextResponse.json(response);

    } else {
      // --- Fetch all tokens for the network ---
      const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("token_details, contract_address, network, logo_url")
        .eq("network", officialNetworkName);

      if (error) throw error;

      const tokens = (data || []).map((token) => ({
          symbol: token.token_details.symbol,
          name: token.token_details.name,
          decimals: token.token_details.decimals,
          network: token.network,
          contract: token.contract_address,
          logo_url: token.logo_url, // The logo_url is already linked and stored.
      }));
      
      await supabaseAdmin.from("api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", client.id);
      return NextResponse.json(tokens);
    }

  } catch (err: any) {
    console.error("Error fetching token(s):", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
