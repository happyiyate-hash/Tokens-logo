
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidApiKey } from "@/lib/api-helpers";
import { searchLogoBySymbol, fetchLogoFromCoinGeckoByContract, uploadLogoFromBuffer } from "@/lib/fetchers";
import chainsConfig from "@/lib/chains.json";
import axios from 'axios';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const contract = searchParams.get('contract');
    const network = searchParams.get('network');
    const clientKey = request.headers.get("x-api-key");
    
    const client = await isValidApiKey(clientKey);
    if (!client) {
        return NextResponse.json({ error: "Invalid or missing API key" }, { status: 403 });
    }

    if (!network || (!symbol && !contract)) {
      return NextResponse.json({ error: "network and (symbol or contract) required" }, { status: 400 });
    }

    // 1. Try direct lookup in token_logos
    let logoRow = null;
    if (contract) {
      const { data } = await supabaseAdmin.from("token_logos").select("*").eq("contract", contract.toLowerCase()).eq("network", network).limit(1).maybeSingle();
      logoRow = data;
    }
    if (!logoRow && symbol) {
      const { data } = await supabaseAdmin.from("token_logos").select("*").eq("symbol", symbol.toLowerCase()).eq("network", network).limit(1).maybeSingle();
       logoRow = data;
    }

    // If found, update last_used and return
    if (logoRow) {
      await supabaseAdmin.from("api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", client.id);
      return NextResponse.json({ ok: true, logo_url: logoRow.public_url });
    }

    // 2. No logo in DB: try CoinGecko
    let remoteLogoUrl = null;
    const chain = chainsConfig.find(c => c.name.toLowerCase() === network.toLowerCase() || c.id.toLowerCase() === network.toLowerCase());

    if (contract && chain?.cgPlatform) {
      remoteLogoUrl = await fetchLogoFromCoinGeckoByContract(contract, chain.cgPlatform);
    }
    if (!remoteLogoUrl && symbol) {
      remoteLogoUrl = await searchLogoBySymbol(symbol);
    }

    if (!remoteLogoUrl) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    // 3. Download, upload to storage, and save record
    const imageResp = await axios.get(remoteLogoUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResp.data);
    const contentType = imageResp.headers['content-type'] || 'image/png';
    const ext = contentType.split('/').pop()?.split(';')[0] || 'png';
    const key = `${(contract || symbol!).toLowerCase()}.${ext}`;

    const publicUrl = await uploadLogoFromBuffer(network, key, buffer, contentType);
    
     // Upsert the token_logos record
    await supabaseAdmin.rpc("upsert_token_logo", {
        p_contract: contract ? contract.toLowerCase() : null,
        p_symbol: (symbol || contract!).toLowerCase(),
        p_network: network,
        p_storage_path: `${network}/${key}`,
        p_public_url: publicUrl
    });


    // Update last_used for the API key
    await supabaseAdmin.from("api_clients").update({ last_used_at: new Date().toISOString() }).eq("id", client.id);

    return NextResponse.json({ ok: true, logo_url: publicUrl });

  } catch (err: any) {
    console.error("Error in getLogo handler:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
