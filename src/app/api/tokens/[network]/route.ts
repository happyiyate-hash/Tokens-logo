
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isValidApiKey = async (apiKey: string): Promise<boolean> => {
    if (!supabaseServiceKey) return false;
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
  { params }: { params: { network: string } }
) {
  
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
    const { data, error } = await supabase
      .from("token_metadata")
      .select("contract_address, network, token_details, logo_url, verified, source, fetched_at, updated_at")
      .eq("network", networkIdentifier.toLowerCase());

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

  } catch (e: any) {
     console.error("API route error:", e.message);
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}
