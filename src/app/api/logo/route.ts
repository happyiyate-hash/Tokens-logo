
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidApiKey } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const name = searchParams.get('name'); // Optional name parameter for specificity
  const clientKey = req.headers.get('x-api-key');

  if (!symbol) {
    return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
  }

  const client = await isValidApiKey(clientKey);
  if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
  }

  // Build the query to be specific
  let query = supabaseAdmin
    .from('token_logos')
    .select('public_url')
    .eq('symbol', symbol.toUpperCase());

  // If a name is provided, use it to find the exact logo.
  // This is crucial for tokens that share a symbol but have different names.
  if (name) {
    query = query.ilike('name', `%${name}%`);
  }
  
  // Always get the first result.
  query = query.limit(1).maybeSingle();

  const { data, error } = await query;

  if (error) {
    console.error("API Logo fetch error:", error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
  
  if (!data) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  // Return the URL under a consistent name 'logo_url' for the API consumer
  return NextResponse.json({ logo_url: data.public_url });
}

    