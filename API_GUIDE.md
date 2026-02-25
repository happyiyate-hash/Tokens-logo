# Developer API Guide: Direct Supabase Access

This document explains how to connect your external application (e.g., a crypto wallet) directly to the Supabase database to fetch token metadata and logos.

**Important**: This method requires you to have the Supabase Project URL and the public `anon` key. The application owner will provide these to you.

## 1. Setup: Connecting to Supabase

First, install the Supabase client library in your JavaScript/TypeScript project:
```bash
npm install @supabase/supabase-js
```

Then, initialize the client. You only need to do this once in your application.

```javascript
import { createClient } from '@supabase/supabase-js';

// Get these values from the application owner
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. Fetching All Tokens for a Network

This is the most efficient way to get a list of all supported tokens for a given blockchain network, including their pricing information. You should call this for each network your wallet supports and cache the results.

-   **Table**: `token_metadata`
-   **Input**: `networkName` (string, e.g., `polygon`, `ethereum`). Case-insensitive.

### Example Code

```javascript
/**
 * Fetches all tokens for a given network directly from Supabase.
 *
 * @param {object} supabase - An initialized Supabase client instance.
 * @param {string} networkName - The name of the network (e.g., 'polygon').
 * @returns {Promise<Array<object>|null>} A list of token objects or null on error.
 */
async function getAllTokensForNetwork(supabase, networkName) {
  const { data, error } = await supabase
    .from('token_metadata')
    .select('token_details, contract_address, network, logo_url')
    .eq('network', networkName.toLowerCase());

  if (error) {
    console.error(`Error fetching tokens for ${networkName}:`, error);
    return null;
  }

  if (!data) return [];

  // The 'token_details' field is a JSON object, so we flatten it for easier use.
  return data.map(token => ({
    symbol: token.token_details.symbol,
    name: token.token_details.name,
    decimals: token.token_details.decimals,
    network: token.network,
    contract: token.contract_address,
    logo_url: token.logo_url,
    priceSource: token.token_details.priceSource, // e.g., "coingecko"
    priceId: token.token_details.priceId,       // e.g., "wrapped-bitcoin"
  }));
}

// --- Example Usage ---
// getAllTokensForNetwork(supabase, 'polygon').then(tokens => {
//   if (tokens) {
//     console.log('Fetched Polygon tokens:', tokens);
//     // Example token object:
//     // {
//     //   "symbol": "WBTC",
//     //   "name": "Wrapped Bitcoin",
//     //   "decimals": 8,
//     //   "network": "polygon",
//     //   "contract": "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
//     //   "logo_url": "/api/cdn/logo/wrapped-bitcoin/wbtc",
//     //   "priceSource": "coingecko",
//     //   "priceId": "wrapped-bitcoin"
//     // }
//   }
// });
```

### **CRITICAL NOTE on `logo_url`**

The `logo_url` returned by this function is a **relative path** that points to the CDN application's caching layer (e.g., `/api/cdn/logo/wrapped-bitcoin/wbtc`).

To use this URL, you **MUST** prepend the base URL of the main Token CDN application.

**Example:**
If the Token CDN application is hosted at `https://my-token-cdn.com`, the full image URL would be:
`https://my-token-cdn.com/api/cdn/logo/wrapped-bitcoin/wbtc`

Using the CDN app's URL is recommended for performance and reliability.

---

## 3. Fetching a Specific Logo (Direct from Storage)

If you only have a token's name and symbol and need its logo, you can fetch it directly from Supabase Storage. This method bypasses the CDN application's caching layer.

The lookup logic prioritizes the `name` for accuracy, as multiple tokens can share the same `symbol` (e.g., "ETH" on different networks is often "Wrapped Ether"). If no match is found by `name`, it will fall back to searching by `symbol`.

-   **Table**: `token_logos`
-   **Input**: `tokenName` (string), `tokenSymbol` (string).

### Example Code

```javascript
/**
 * Fetches a token's direct logo URL from Supabase storage.
 * It's recommended to get the logo from the 'getAllTokensForNetwork' function instead.
 * Use this only as a fallback.
 *
 * @param {object} supabase - An initialized Supabase client instance.
 * @param {string} tokenName - The full name of the token (e.g., 'Wrapped Ether').
 * @param {string} tokenSymbol - The symbol of the token (e.g., 'WETH').
 * @returns {Promise<string|null>} The direct public URL to the logo in storage, or null if not found.
 */
async function getDirectLogoUrl(supabase, tokenName, tokenSymbol) {
  // 1. Prioritize lookup by the full token name for accuracy
  const { data: nameData, error: nameError } = await supabase
    .from('token_logos')
    .select('public_url')
    .ilike('name', tokenName)
    .limit(1)
    .single();

  if (nameError && nameError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching logo by name:', nameError);
  }

  if (nameData) {
      return nameData.public_url;
  }

  // 2. If no match is found by name, fall back to the symbol
  const { data: symbolData, error: symbolError } = await supabase
      .from('token_logos')
      .select('public_url')
      .ilike('symbol', tokenSymbol)
      .limit(1)
      .single();

  if (symbolError && symbolError.code !== 'PGRST116') {
      console.error('Error fetching logo by symbol:', symbolError);
  }

  // The 'public_url' is the direct, full URL to the image file.
  return symbolData ? symbolData.public_url : null;
}


// --- Example Usage ---
// getDirectLogoUrl(supabase, 'Wrapped Ether', 'WETH').then(url => {
//   if (url) {
//     console.log('Fetched direct logo URL:', url);
//     // Example URL:
//     // "https://[project-ref].supabase.co/storage/v1/object/public/token_logos/global/wrapped-ether-weth.png"
//   }
// });
```
