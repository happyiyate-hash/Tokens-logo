
"use server";

import { ethers } from "ethers";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";
import chainsConfig from "@/lib/chains.json";

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

const ERC20_MIN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

export async function fetchTokenMetadataFromSources(contractAddress: string, networkName: string): Promise<Partial<TokenFetchResult>> {
    const chain = findChainByName(networkName);
    if (!chain) throw new Error(`Unsupported network: ${networkName}`);
    
    // 1. Try Etherscan V2 First
    try {
        const params = {
            chainid: chain.chainId,
            module: "token",
            action: "tokeninfo",
            contractaddress: contractAddress,
            apikey: process.env.ETHERSCAN_API_KEY || "",
        };

        const { data } = await axios.get(ETHERSCAN_V2_BASE, { params, timeout: 8000 });

        if (data && data.result) {
            const r = Array.isArray(data.result) ? data.result[0] : data.result;
            if (r) {
                const name = decodeBytes32(r.tokenName || r.name || r.TokenName || r.TokenNameHex);
                const symbol = decodeBytes32(r.symbol || r.Symbol || r.TokenSymbol || r.TokenSymbolHex);
                const decimals = r.decimals !== undefined && r.decimals !== null ? Number(r.decimals) : undefined;
                
                // If explorer returns all key fields, we are done.
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
    } catch (e: any) {
        console.warn(`Explorer fetch failed for ${contractAddress} on ${networkName}, falling back to RPC. Error: ${e.message}`);
    }

    // 2. Fallback to RPC if explorer fails or returns partial data
    if (!chain.rpc) {
        throw new Error(`No RPC URL configured for network: ${networkName}`);
    }

    try {
        const provider = new ethers.JsonRpcProvider(chain.rpc);
        const token = new ethers.Contract(contractAddress, ERC20_MIN_ABI, provider);

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
            name: name || symbol || "Unknown",
            symbol: symbol || name || "???",
            decimals: decimals ?? 18, // Default to 18 if decimals are not found
            source: "rpc"
        };
    } catch (e: any) {
        console.error(`RPC fallback failed for ${contractAddress} on ${networkName}:`, e.message);
        throw new Error("Could not fetch complete token metadata from any source.");
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
