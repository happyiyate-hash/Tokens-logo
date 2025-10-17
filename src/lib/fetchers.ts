
"use server";

import { ethers } from "ethers";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";
import chainsConfig from "@/lib/chains.json";
import pRetry from 'p-retry';

const ERC20_MIN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

// --- Helper function to attempt fetching from an explorer ---
async function fetchFromExplorer(chain: any, contractAddress: string): Promise<Partial<TokenFetchResult> | null> {
    const apikey = process.env.ETHERSCAN_API_KEY || "";
    if (!chain.explorerApi) return null;

    // Use 'tokeninfo' for Polygon, which is more direct
    const isPolygon = chain.chainId === 137;
    const module = isPolygon ? "token" : "account";
    const action = isPolygon ? "tokeninfo" : "tokentx";

    try {
        const { data } = await axios.get(chain.explorerApi, {
            params: {
                module,
                action,
                contractaddress: contractAddress,
                // params for tokentx
                page: 1,
                offset: 1,
                // params for tokeninfo
                token_address: contractAddress, 
                apikey,
            },
            timeout: 5000 // 5-second timeout
        });
        
        let resultData = data.result;
        // The 'tokeninfo' on polygonscan returns the object directly in `result`
        if (isPolygon && resultData) {
           resultData = [resultData]; // Normalize to an array
        }

        if (data && (data.status === "1" || data.message === "OK") && resultData?.length > 0) {
            const tx = resultData[0];
            
            const name = decodeBytes32(tx.tokenName || tx.name);
            const symbol = decodeBytes32(tx.tokenSymbol || tx.symbol);
            const decimals = Number(tx.tokenDecimal || tx.decimals);

            if (name && symbol && !isNaN(decimals)) {
                return { name, symbol, decimals, source: "explorer" };
            }
        }
    } catch (e: any) {
        console.warn(`Explorer API call failed for ${contractAddress} on ${chain.name}: ${e.message}`);
    }

    return null;
}


async function fetchFromRpc(chain: any, contractAddress: string): Promise<Partial<TokenFetchResult>> {
    if (!chain.rpc) {
        throw new Error(`No RPC URL configured for network: ${chain.name}`);
    }

    try {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
        const token = new ethers.Contract(contractAddress, ERC20_MIN_ABI, provider);

        // Using pRetry to handle intermittent RPC errors
        const fetchWithRetry = (fn: () => Promise<any>) => pRetry(fn, { 
            retries: 2, 
            minTimeout: 500,
            onFailedAttempt: error => {
                console.warn(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. For ${contractAddress} on ${chain.name}`);
            }
        });

        const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
            fetchWithRetry(() => token.name()),
            fetchWithRetry(() => token.symbol()),
            fetchWithRetry(() => token.decimals())
        ]);

        const name = nameResult.status === 'fulfilled' ? decodeBytes32(nameResult.value) : undefined;
        const symbol = symbolResult.status === 'fulfilled' ? decodeBytes32(symbolResult.value) : undefined;
        const decimals = decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : undefined;

        if (!name && !symbol) {
             throw new Error("Could not fetch name or symbol from RPC after retries.");
        }

        return {
            name: name || symbol || "Unknown",
            symbol: symbol || name || "???",
            decimals: decimals ?? 18,
            source: "rpc"
        };
    } catch (e: any) {
        console.error(`RPC fallback failed for ${contractAddress} on ${chain.name}:`, e.message);
        throw new Error("Could not fetch complete token metadata from any source.");
    }
}


export async function fetchTokenMetadataFromSources(contractAddress: string, networkName: string): Promise<Partial<TokenFetchResult>> {
    const chain = findChainByName(networkName);
    if (!chain) throw new Error(`Unsupported network: ${networkName}`);
    
    // 1. Try Block Explorer First
    const explorerResult = await fetchFromExplorer(chain, contractAddress);
    if (explorerResult?.name && explorerResult?.symbol && explorerResult.decimals !== undefined) {
        return explorerResult;
    }

    // 2. Fallback to RPC if explorer fails
    console.warn(`Explorer fetch failed or returned incomplete data for ${contractAddress} on ${networkName}. Falling back to RPC.`);
    
    return fetchFromRpc(chain, contractAddress);
}


export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = "https://api.coingecko.com/api/v3";
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

    

    