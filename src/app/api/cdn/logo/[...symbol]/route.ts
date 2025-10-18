
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const STORAGE_BUCKET = "token_logos";
// This is a simplified in-memory cache. For a production serverless environment,
// a distributed cache like Redis or Vercel KV would be more robust.
// However, this demonstrates the caching proxy architecture.
const cache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour cache

export async function GET(
  req: Request,
  { params }: { params: { symbol: string[] } } // The param can be a path array
) {
  // The route is now /api/cdn/logo/[...symbol], so params.symbol is an array.
  // e.g., /api/cdn/logo/arbitrum/eth -> ['arbitrum', 'eth']
  // e.g., /api/cdn/logo/ethereum -> ['ethereum'] (for old single-param routes)
  const pathParts = params.symbol;

  if (!pathParts || pathParts.length === 0) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // New logic: Handle both new and old URL formats
  const hasName = pathParts.length > 1;
  const name = hasName ? pathParts[0] : null;
  const symbol = hasName ? pathParts[1] : pathParts[0];
  
  if (!symbol) {
    return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
  }

  const cacheKey = `logo-${name ? name + '-' : ''}${symbol.toLowerCase()}`;
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
    let query = supabaseAdmin
      .from('token_logos')
      .select('storage_path');
      
    // ** NEW: Prioritize name for lookup if it exists **
    if (name) {
      query = query.ilike('name', name);
    } else {
      query = query.ilike('symbol', symbol);
    }

    let { data: logoData, error: dbError } = await query.limit(1).single();

    if (dbError || !logoData) {
       // If lookup by name fails, try a fallback to just the symbol
       if (name) {
           const { data: fallbackData, error: fallbackError } = await supabaseAdmin
            .from('token_logos')
            .select('storage_path')
            .ilike('symbol', symbol)
            .limit(1)
            .single();
          
          if (fallbackError || !fallbackData) {
            return NextResponse.json({ error: 'Logo not found in database' }, { status: 404 });
          }
          // Use the fallback data if the primary query fails
          logoData = fallbackData;
       } else {
          return NextResponse.json({ error: 'Logo not found in database' }, { status: 404 });
       }
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
    console.error(`[CDN LOGO FETCH ERROR] for ${name}/${symbol}:`, error);
    // Serve a default placeholder or return an error
    return NextResponse.json({ error: 'Failed to fetch logo.' }, { status: 500 });
  }
}

    