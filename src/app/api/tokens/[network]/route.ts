
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
    // Check if the identifier is a UUID (for network ID) or a string (for network name)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(networkIdentifier);

    let networkId = networkIdentifier;
    
    // If it's not a UUID, assume it's a name and get the ID
    if (!isUUID) {
       const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
       const { data: networkData, error: networkError } = await supabaseAdmin
        .from('networks')
        .select('id')
        .ilike('name', networkIdentifier.replace(/%20/g, ' '))
        .single();
        
       if (networkError || !networkData) {
         return NextResponse.json({ error: `Network with name "${networkIdentifier}" not found.` }, { status: 404 });
       }
       networkId = networkData.id;
    }
    
    const { data, error } = await supabase
      .from("tokens")
      .select("name, symbol, decimals, network_id, logo_url, contract")
      .eq("network_id", networkId);

    if (error) {
       console.error("Supabase error:", error.message);
       throw error;
    }

    return NextResponse.json(data || []);

  } catch (e: any) {
     console.error("API route error:", e.message);
    return NextResponse.json(
      { error: `An internal server error occurred.` },
      { status: 500 }
    );
  }
}
