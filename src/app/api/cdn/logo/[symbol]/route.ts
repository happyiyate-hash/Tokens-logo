
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidApiKey } from '@/lib/api-helpers';

const STORAGE_BUCKET = "token_logos";
// This is a simplified in-memory cache. For a production serverless environment,
// a distributed cache like Redis or Vercel KV would be more robust.
// However, this demonstrates the caching proxy architecture.
const cache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour cache

export async function GET(
  req: Request,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params;
  const clientKey = req.headers.get('x-api-key');

  if (!symbol) {
    return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
  }

  // Optional: You can re-enable API key validation if you want to protect this endpoint.
  // For a public CDN, you might leave this commented out.
  /*
  const client = await isValidApiKey(clientKey);
  if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
  }
  */

  const cacheKey = `logo-${symbol.toLowerCase()}`;
  const cachedItem = cache.get(cacheKey);

  // 1. Check if a valid, non-expired item is in the cache
  if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL)) {
    return new NextResponse(cachedItem.buffer, {
      headers: {
        'Content-Type': cachedItem.contentType,
        'X-Cache-Status': 'HIT',
      },
    });
  }

  try {
    // 2. If not in cache, fetch the logo metadata from the database
    const { data: logoData, error: dbError } = await supabaseAdmin
      .from('token_logos')
      .select('storage_path')
      .ilike('symbol', symbol)
      .limit(1)
      .single();

    if (dbError || !logoData) {
      return NextResponse.json({ error: 'Logo not found in database' }, { status: 404 });
    }

    // 3. Fetch the actual image file from Supabase Storage (our Origin)
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(logoData.storage_path);

    if (storageError || !storageData) {
      throw new Error('Failed to download logo from origin storage.');
    }
    
    const buffer = Buffer.from(await storageData.arrayBuffer());
    const contentType = storageData.type || 'image/png'; // Default to png if type is missing

    // 4. Store the fetched logo in our cache
    cache.set(cacheKey, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });
    
    // 5. Serve the logo to the client
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'X-Cache-Status': 'MISS',
      },
    });

  } catch (error: any) {
    console.error(`[CDN LOGO FETCH ERROR] for ${symbol}:`, error);
    // Serve a default placeholder or return an error
    return NextResponse.json({ error: 'Failed to fetch logo.' }, { status: 500 });
  }
}
