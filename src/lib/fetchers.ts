
"use server";

import { ethers } from "ethers";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";
import chainsConfig from "@/lib/chains.json";

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

    // Use the 'tokentx' action which is more universally supported than 'tokeninfo'
    // It gets the details from the first transaction event for that token contract.
    try {
        const { data } = await axios.get(chain.explorerApi, {
            params: {
                module: "account",
                action: "tokentx",
                contractaddress: contractAddress,
                page: 1,
                offset: 1,
                apikey,
            },
            timeout: 5000 // 5-second timeout
        });

        // Check for a valid response and at least one transaction
        if (data && data.status === "1" && data.result?.length > 0) {
            const tx = data.result[0];
            
            // Ensure all required fields are present in the response
            if (tx.tokenName && tx.tokenSymbol && tx.tokenDecimal) {
                 const name = decodeBytes32(tx.tokenName);
                 const symbol = decodeBytes32(tx.tokenSymbol);
                 const decimals = Number(tx.tokenDecimal);

                 // Final validation to ensure we have meaningful data
                 if (name && symbol && !isNaN(decimals)) {
                     return { name, symbol, decimals, source: "explorer" };
                 }
            }
        }
    } catch (e: any) {
        console.warn(`Explorer API call failed for ${contractAddress} on ${chain.name}: ${e.message}`);
    }

    return null; // Return null if explorer method fails or data is incomplete
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
    if (!chain.rpc) {
        throw new Error(`No RPC URL configured for network: ${networkName}`);
    }

    try {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
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
