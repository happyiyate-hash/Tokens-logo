"use server";

import axios from "axios";
import { ethers } from "ethers";
import type { TokenFetchResult } from "@/lib/types";
import pRetry from 'p-retry';
import chainsConfig from "@/lib/chains.json";
import { decodeBytes32 } from "@/lib/hextools";

// Minimal ABI to get token details
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

/**
 * Fetches token details (name, symbol, decimals) directly from the blockchain via an RPC call.
 * This is the preferred method as it's decentralized and doesn't rely on third-party APIs.
 * @param chainId The chain ID of the network.
 * @param contractAddress The address of the ERC20 token contract.
 * @returns A partial TokenFetchResult with the token's on-chain data.
 */
async function fetchFromRpc(chainId: number, contractAddress: string): Promise<Partial<TokenFetchResult>> {
    const chain = chainsConfig.find(c => c.chainId === chainId);
    if (!chain || !chain.rpc) {
        throw new Error(`RPC endpoint not configured for chain ID ${chainId}.`);
    }
    
    if (chain.rpc.includes('YOUR_INFURA_KEY') || chain.rpc.includes('YOUR_API_KEY')) {
        throw new Error(`RPC for ${chain.name} requires an API key which is not configured in chains.json.`);
    }

    const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

    try {
        // Using Promise.all to fetch in parallel for efficiency
        const [name, symbol, decimals] = await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.decimals(),
        ]);
        
        // Some contracts (especially older ones) return bytes32 strings. We need to decode them.
        const decodedName = decodeBytes32(name);
        const decodedSymbol = decodeBytes32(symbol);

        if (!decodedName || !decodedSymbol) {
             throw new Error("Invalid token contract. Name or symbol is empty after decoding.");
        }

        return {
            name: decodedName,
            symbol: decodedSymbol,
            decimals: Number(decimals),
            source: `Blockchain RPC (${chain.name})` // Source is now the direct RPC call
        };

    } catch (error: any) {
        console.error(`Direct RPC call failed for ${contractAddress} on chain ${chainId}:`, error.message);
        throw new Error(`Could not fetch token details via RPC. Ensure the address is a valid ERC20 contract on ${chain.name}.`);
    }
}

/**
 * Searches CoinGecko for a coin ID based on its name and symbol.
 * This is used to enrich the token data with a price feed.
 * @param tokenName The name of the token.
 * @param tokenSymbol The symbol of the token.
 * @returns The CoinGecko coin ID, or null if not found.
 */
async function getCoinGeckoIdByName(tokenName: string, tokenSymbol: string): Promise<string | null> {
    try {
        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(tokenName)}`;
        const { data: searchData } = await pRetry(() => axios.get(searchUrl, { timeout: 5000 }), { retries: 1 });
        
        if (searchData.coins && searchData.coins.length > 0) {
            // Prefer an exact symbol match to get the correct coin
            const exactMatch = searchData.coins.find((c: any) => c.symbol?.toLowerCase() === tokenSymbol.toLowerCase());
            if (exactMatch) return exactMatch.id;
            // Fallback to the first result if no exact match is found
            return searchData.coins[0].id;
        }
        return null;
    } catch (e) {
        console.warn(`CoinGecko search by name failed for ${tokenName}:`, e);
        return null;
    }
}

/**
 * The main orchestrator function for fetching token metadata.
 * It first fetches the core data (name, symbol, decimals) directly from the blockchain via RPC.
 * Then, it enriches this data with a price ID from CoinGecko.
 * @param contractAddress The address of the token contract.
 * @param chainId The chain ID of the network.
 * @returns A partial TokenFetchResult containing the aggregated data.
 */
export async function fetchTokenMetadataFromSources(contractAddress: string, chainId: number): Promise<Partial<TokenFetchResult>> {
    // Step 1: Get base metadata directly from the blockchain. This is the new primary source.
    const baseMetadata = await fetchFromRpc(chainId, contractAddress);
    
    if (!baseMetadata.name || !baseMetadata.symbol) {
        throw new Error("Could not fetch base metadata (name, symbol) from the blockchain RPC.");
    }

    // Step 2 (Enrichment): Auto-detect Price ID and Source from CoinGecko.
    const chain = chainsConfig.find(c => c.chainId === chainId);
    const coingeckoPlatformId = chain?.cgPlatform;
    let priceId: string | null = null;
    let priceSource: string | null = null;

    // First, try the most reliable method: lookup by contract on the specific platform (e.g., 'ethereum').
    if (coingeckoPlatformId) {
        try {
            const cgUrl = `https://api.coingecko.com/api/v3/coins/${coingeckoPlatformId}/contract/${contractAddress.toLowerCase()}`;
            const { data: cgData } = await pRetry(() => axios.get(cgUrl), { retries: 1 });
            if (cgData.id) {
                priceId = cgData.id;
                priceSource = 'coingecko';
            }
        } catch (e) {
            console.warn(`CoinGecko lookup by contract for ${contractAddress} failed, falling back to search by name.`);
        }
    }

    // If contract lookup fails or is not possible, fall back to searching by name.
    if (!priceId) {
        const foundId = await getCoinGeckoIdByName(baseMetadata.name, baseMetadata.symbol);
        if (foundId) {
            priceId = foundId;
            priceSource = 'coingecko';
        }
    }

    // Combine the on-chain data with the off-chain enrichment data.
    return {
        ...baseMetadata,
        priceId: priceId ?? undefined,
        priceSource: priceSource ?? 'unknown',
    };
}


/**
 * Fetches a token's logo URL from CoinGecko using its symbol.
 * This is used by the AI flow as a tool to find missing logos.
 * @param symbol The symbol of the token (e.g., "WETH").
 * @returns The URL of the logo, or null if not found.
 */
export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = "https://api.coingecko.com/api/v3";
  try {
    const { data: searchData } = await axios.get(`${coingeckoApiUrl}/search?query=${encodeURIComponent(symbol)}`, { timeout: 8000 });
    const coins = searchData.coins || [];
    
    // Prioritize an exact symbol match to avoid ambiguity (e.g., "ETH" on different chains).
    const exactMatch = coins.find((c: any) => c.symbol && c.symbol.toLowerCase() === symbol.toLowerCase());
    const coinToFetch = exactMatch || coins[0];
    
    if (!coinToFetch || !coinToFetch.id) return null;
    
    // Fetch detailed data to get the image URLs.
    const { data: details } = await axios.get(`${coingeckoApiUrl}/coins/${coinToFetch.id}`);
    return details?.image?.large || details?.image?.small || details?.image?.thumb || null;
  } catch (e: any) {
    console.error(`CoinGecko search failed for symbol ${symbol}:`, e.message);
    return null;
  }
}
