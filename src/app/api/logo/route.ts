
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidApiKey } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const name = searchParams.get('name'); // Optional name parameter
  const clientKey = req.headers.get('x-api-key');

  if (!symbol) {
    return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
  }

  const client = await isValidApiKey(clientKey);
  if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
  }

  // --- Build the query ---
  let query = supabaseAdmin
    .from('token_logos')
    .select('logo_url')
    .eq('symbol', symbol.toUpperCase());

  // If a name is provided, add it to the query for a more specific search.
  // This helps differentiate between tokens with the same symbol (e.g., ETH on different networks).
  if (name) {
    query = query.ilike('name', `%${name}%`);
  }
  
  query = query.limit(1).maybeSingle();

  // --- Fetch logo ---
  const { data, error } = await query;

  if (error) {
    console.error("API Logo fetch error:", error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
  
  if (!data) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
