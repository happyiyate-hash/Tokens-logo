
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
    .ilike('symbol', symbol); // Use ilike for case-insensitive symbol matching

  // If a name is provided, use it to find a more exact match.
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
  
  if (!data || !data.public_url) {
    // If no logo is found, we should redirect to our own smart CDN endpoint
    // which can then try to serve a default or handle it gracefully.
    // For now, we return 404 as per the original design.
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  // Instead of returning the direct Supabase URL, we redirect to our own CDN endpoint.
  // This makes the entire system act as a unified CDN layer.
  const cdnUrl = `/api/cdn/logo/${symbol.toLowerCase()}`;
  
  // Return the URL to our caching CDN layer
  return NextResponse.json({ logo_url: cdnUrl });
}
