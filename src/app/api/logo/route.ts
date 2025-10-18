
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidApiKey } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const name = searchParams.get('name'); // Name is now the preferred lookup key
  const clientKey = req.headers.get('x-api-key');

  // A name or symbol is required.
  if (!name && !symbol) {
    return NextResponse.json({ error: 'Missing required parameter: name or symbol' }, { status: 400 });
  }

  const client = await isValidApiKey(clientKey);
  if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
  }

  // Build the query, prioritizing name for accuracy
  let query = supabaseAdmin
    .from('token_logos')
    .select('public_url');

  // ** NEW LOGIC **
  // If a name is provided, use it as the primary and most reliable filter.
  // This is crucial for tokens that share a symbol but have different names.
  if (name) {
    query = query.ilike('name', name);
  } else if (symbol) {
    // Only use symbol as a fallback if name is not provided.
    query = query.ilike('symbol', symbol); 
  }
  
  // Always get the first result.
  query = query.limit(1).maybeSingle();

  const { data, error } = await query;

  if (error) {
    console.error("API Logo fetch error:", error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
  
  if (!data || !data.public_url) {
    // If no logo is found, we can return a 404.
    // The wallet can then try to use the AI fetcher or a default.
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  // Instead of returning the direct Supabase URL, we redirect to our own CDN endpoint.
  // This makes the entire system act as a unified CDN layer.
  // We use the original symbol if available, otherwise a placeholder from the name.
  const cdnSymbol = symbol || name!.toLowerCase().replace(/\s/g, '-');
  const cdnUrl = `/api/cdn/logo/${cdnSymbol.toLowerCase()}`;
  
  // Return the URL to our caching CDN layer
  return NextResponse.json({ logo_url: cdnUrl });
}
