
"use server";

import { ethers } from "ethers";
import { supabaseAdmin } from "./supabase/admin";
import chainsConfig from "@/lib/chains.json";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

export async function fetchFromExplorer(contract: string, networkName: string): Promise<Partial<TokenFetchResult> | null> {
  const chain = findChainByName(networkName);
  if (!chain || !chain.explorerApi) return null;
  
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
      console.warn("ETHERSCAN_API_KEY environment variable is not set. Explorer fetch will likely fail.");
  }
  
  const params = {
      chainid: chain.chainId,
      module: "token",
      action: "tokeninfo",
      contractaddress: contract,
      apikey: apiKey || "",
    };

  try {
    const { data } = await axios.get(ETHERSCAN_V2_BASE, { params, timeout: 8000 });
    
    if (data && data.result) {
      const r = Array.isArray(data.result) ? data.result[0] : data.result;
      if (r) {
        const name = decodeBytes32(r.tokenName || r.name || r.TokenName || r.TokenNameHex || '');
        const symbol = decodeBytes32(r.symbol || r.Symbol || r.TokenSymbol || r.TokenSymbolHex || '');
        const decimals = r.decimals !== undefined && r.decimals !== null ? Number(r.decimals) : undefined;

        if (name && symbol && decimals !== undefined) {
             return {
                name,
                symbol,
                decimals,
                source: "explorer"
             };
        }
      }
    }
    // If we reach here, explorer data was insufficient, so we return null to trigger RPC fallback.
    return null;

  } catch (e: any) {
    console.error(`Explorer fetch failed for ${contract} on ${networkName}:`, e.message);
    return null;
  }
}

export async function fetchFromRpc(contract: string, rpcUrl: string): Promise<Partial<TokenFetchResult> | null> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const token = new ethers.Contract(contract, ERC20_ABI, provider);
    
    const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
      token.name(), 
      token.symbol(), 
      token.decimals()
    ]);
    
    const name = nameResult.status === 'fulfilled' ? decodeBytes32(nameResult.value) : undefined;
    const symbol = symbolResult.status === 'fulfilled' ? decodeBytes32(symbolResult.value) : undefined;
    const decimals = decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : undefined;

    if (!name && !symbol) {
        throw new Error("Could not fetch name or symbol from RPC.");
    }

    return {
      name,
      symbol,
      decimals: decimals ?? 18, // Default to 18 if decimals fails
      source: "rpc"
    };
  } catch (e: any) {
    console.warn(`RPC fetch failed for ${contract} at ${rpcUrl}:`, e.message);
    return null;
  }
}

export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
  try {
    const { data: searchData } = await axios.get(`${coingeckoApiUrl}/search?query=${encodeURIComponent(symbol)}`, { timeout: 8000 });
    const coins = searchData.coins || [];
    
    const exactMatch = coins.find((c: any) => c.symbol && c.symbol.toLowerCase() === symbol.toLowerCase());
    const coinToFetch = exactMatch || coins[0];
    
    if (!coinToFetch || !coinToFetch.id) return null;
    
    const { data: details } = await axios.get(`${coingeckoApiUrl}/coins/${coinToFetch.id}`);
    return details?.image?.large || details?.image?.small || details?.image?.thumb || null;
  } catch (e: any) {
    console.error(`CoinGecko search failed for symbol ${symbol}:`, e.message);
    return null;
  }
}
