
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidApiKey } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const clientKey = req.headers.get('x-api-key');

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
  }

  const client = await isValidApiKey(clientKey);
  if (!client) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
  }

  // Fetch logo
  const { data, error } = await supabaseAdmin
    .from('token_logos')
    .select('logo_url')
    .eq('symbol', symbol.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

    