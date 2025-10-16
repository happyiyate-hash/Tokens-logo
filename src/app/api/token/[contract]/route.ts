
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Token } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Note: Using the anon key is safe for client-side/public API access
// as long as you have Row Level Security (RLS) enabled on your tables.
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(
  request: Request,
  { params }: { params: { contract: string } }
) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase connection not configured." },
      { status: 500 }
    );
  }

  const contractAddress = params.contract;

  if (!contractAddress) {
    return NextResponse.json(
      { error: "Contract address is required." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("contract", contractAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // PostgREST error code for "No rows found"
        return NextResponse.json({ error: "Token not found." }, { status: 404 });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "Token not found." }, { status: 404 });
    }

    const token: Token = data;
    
    // You could add the AI logo fetch logic here as a fallback,
    // but for a fast API response, it's often better to ensure data exists.

    return NextResponse.json(token);

  } catch (e: any) {
    return NextResponse.json(
      { error: `An internal server error occurred: ${e.message}` },
      { status: 500 }
    );
  }
}
