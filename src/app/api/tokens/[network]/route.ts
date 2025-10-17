
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidApiKey } from "@/lib/api-helpers";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: Request,
  { params }: { params: { network: string } }
) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  
  const requestApiKey = request.headers.get('x-api-key');

  if (!requestApiKey || !(await isValidApiKey(requestApiKey))) {
    return NextResponse.json({ error: "Unauthorized. Invalid or missing API key." }, { status: 401 });
  }

  const networkIdentifier = params.network;

  if (!networkIdentifier) {
    return NextResponse.json(
      { error: "Network identifier is required." },
      { status: 400 }
    );
  }

  try {
    let query = supabase
      .from("token_metadata")
      .select("contract_address, network, token_details, logo_url, verified, source, fetched_at, updated_at")
      .eq("network", networkIdentifier.toLowerCase());

    // If a symbol is provided, filter by it
    if (symbol) {
      query = query.ilike("token_details->>symbol", symbol).limit(1);
      
      const { data, error } = await query.single();
      
      if (error || !data) {
        return NextResponse.json({ error: `Token '${symbol}' not found on network '${networkIdentifier}'.` }, { status: 404 });
      }

      return NextResponse.json(data);

    } else {
      // Otherwise, return all tokens for the network
      const { data, error } = await query;
      
      if (error) {
         console.error("Supabase error:", error.message);
         throw error;
      }
      
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

  } catch (e: any) {
     console.error("API route error:", e.message);
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}
