
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
  // The route is /api/cdn/logo/[...symbol], so params.symbol is an array.
  // e.g., /api/cdn/logo/wrapped-bitcoin/wbtc -> ['wrapped-bitcoin', 'wbtc']
  // e.g., /api/cdn/logo/ethereum -> ['ethereum']
  const pathParts = params.symbol;

  if (!pathParts || pathParts.length === 0) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // The sanitized name is included in the path to handle cases where
  // different tokens share the same symbol.
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
    // 2. If not in cache, fetch all potential logo matches by symbol.
    const { data: logoMatches, error: dbError } = await supabaseAdmin
      .from('token_logos')
      .select('storage_path, name')
      .ilike('symbol', symbol);

    if (dbError || !logoMatches || logoMatches.length === 0) {
      return NextResponse.json({ error: `Logo not found for symbol: ${symbol}` }, { status: 404 });
    }

    let targetLogo: { storage_path: string; name: string | null } | undefined;

    // If a name is provided in the URL, use it to find the specific logo.
    // This is crucial for symbols used by multiple tokens (e.g., 'ETH' on different networks).
    if (name) {
      targetLogo = logoMatches.find(logo => 
        logo.name && logo.name.toLowerCase().replace(/\s+/g, '-') === name
      );
    } else if (logoMatches.length === 1) {
      // If no name is in the URL, we can only proceed if the symbol is unique.
      targetLogo = logoMatches[0];
    }

    if (!targetLogo) {
      const errorMessage = name 
        ? `No logo found for name '${name}' and symbol '${symbol}'`
        : `Ambiguous symbol '${symbol}'. Please use the full name/symbol URL path.`;
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    // 3. Fetch the actual image file from Supabase Storage (our Origin)
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(targetLogo.storage_path);

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
    console.error(`[CDN LOGO FETCH ERROR] for ${name || 'unknown'}/${symbol}:`, error);
    // Serve a default placeholder or return an error
    return NextResponse.json({ error: 'Failed to fetch logo.' }, { status: 500 });
  }
}
