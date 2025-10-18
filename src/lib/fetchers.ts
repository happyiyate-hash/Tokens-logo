
"use server";

import { ethers } from "ethers";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";
import chainsConfig from "@/lib/chains.json";
import pRetry from 'p-retry';

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

// --- Helper to get ABI from Etherscan-like APIs ---
async function getContractAbi(chain: any, contractAddress: string): Promise<any> {
    const apikey = process.env.ETHERSCAN_API_KEY || "";
    if (!chain.explorerApi) {
        throw new Error(`No explorer API configured for ${chain.name}`);
    }

    // A map for explorers that have slightly different API structures.
    const apiAdapter: { [key: string]: { module: string, action: string } } = {
        'api.gnosisscan.io': { module: 'contract', action: 'getabi' },
        'api.ftmscan.com': { module: 'contract', action: 'getabi' },
        'api.arbiscan.io': { module: 'contract', action: 'getabi' },
        // Default to Etherscan standard
        'default': { module: 'contract', action: 'getabi' },
    };

    const explorerHost = new URL(chain.explorerApi).hostname;
    const adapter = apiAdapter[explorerHost] || apiAdapter['default'];

    try {
        const { data } = await axios.get(chain.explorerApi, {
            params: {
                module: adapter.module,
                action: adapter.action,
                address: contractAddress,
                apikey,
            },
            timeout: 7000 // 7-second timeout
        });

        if (data.status === "1" || (data.message === "OK" && data.result)) {
            return JSON.parse(data.result);
        } else {
            // Handle cases where API returns "NOTOK" with a useful message
            const errorMessage = data.result || data.message || 'Failed to fetch ABI';
            throw new Error(`Explorer API Error for ${chain.name}: ${errorMessage}`);
        }
    } catch (e: any) {
        console.error(`ABI fetch failed for ${contractAddress} on ${chain.name}: ${e.message}`);
        // As a fallback, we can use a minimal ABI. This ensures that even if the explorer API is down,
        // we can still fetch data for standard ERC20 tokens.
        console.warn(`Falling back to minimal ABI for ${contractAddress}`);
        return [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
        ];
    }
}


async function fetchFromRpc(chain: any, contractAddress: string): Promise<Partial<TokenFetchResult>> {
    if (!chain.rpc) {
        throw new Error(`No RPC URL configured for network: ${chain.name}`);
    }

    try {
        const abi = await getContractAbi(chain, contractAddress);
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
        const token = new ethers.Contract(contractAddress, abi, provider);

        const fetchWithRetry = (fn: () => Promise<any>) => pRetry(fn, { 
            retries: 2, 
            minTimeout: 500,
            onFailedAttempt: error => {
                console.warn(`Attempt ${error.attemptNumber} failed for ${contractAddress} on ${chain.name}. Retries left: ${error.retriesLeft}.`);
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

        if (name === undefined && symbol === undefined) {
             throw new Error("Could not fetch name or symbol from RPC after retries.");
        }

        return {
            name: name || symbol || "Unknown Token",
            symbol: symbol || name || "???",
            decimals: decimals ?? 18,
            source: `rpc (${chain.name})`
        };
    } catch (e: any) {
        console.error(`RPC call failed for ${contractAddress} on ${chain.name}:`, e.message);
        throw new Error(`Could not fetch complete token metadata from ${chain.name}.`);
    }
}


export async function fetchTokenMetadataFromSources(contractAddress: string, networkName: string): Promise<Partial<TokenFetchResult>> {
    const chain = findChainByName(networkName);
    if (!chain) throw new Error(`Unsupported network: ${networkName}`);
    
    // The new logic directly uses the more robust RPC-based fetching with ABI lookup.
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
