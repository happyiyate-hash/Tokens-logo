# Developer API Guide: Token & Logo CDN

This document explains how to integrate your external application (e.g., a crypto wallet) with this Token CDN service to fetch token metadata and logos.

## 1. Authentication

All API requests must be authenticated using an API key.

1.  **Generate an API Key**: Go to the **Admin Dashboard** of this application, navigate to the **API Keys** page, and generate a new key.
2.  **Include the Key**: Pass your generated API key in the `x-api-key` header for every request.

```
headers: {
  'x-api-key': 'YOUR_API_KEY_HERE'
}
```

---

## 2. API Endpoints

The base URL for these endpoints is the URL of this application. You can get it dynamically in a browser environment using `window.location.origin`.

### Endpoint 1: Get All Tokens for a Network

This is the most efficient and recommended endpoint for wallet integration. It fetches a complete list of all tokens for a given network, with their metadata and CDN-managed logo URLs already linked.

Your wallet should call this for each supported network on startup and cache the result locally for performance.

-   **Endpoint**: `GET /api/tokens/[network]`
-   **`[network]`**: The name of the network (e.g., `polygon`, `ethereum`). This is case-insensitive.

#### Example Response (`GET /api/tokens/polygon`)

The response is an array of token objects.

```json
[
  {
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "network": "polygon",
    "contract": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    "logo_url": "/api/cdn/logo/usd-coin/usdc"
  },
  {
    "symbol": "WETH",
    "name": "Wrapped Ether",
    "decimals": 18,
    "network": "polygon",
    "contract": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    "logo_url": "/api/cdn/logo/wrapped-ether/weth"
  }
]
```

**Note on `logo_url`**: The URL is a relative path. Your application should prepend its own domain to use it. For example, if your app is at `https://my-cdn.com`, the full URL would be `https://my-cdn.com/api/cdn/logo/usd-coin/usdc`.

#### Example Code

```javascript
/**
 * Fetches all tokens for a given network using your API key.
 * Your wallet should call this for each supported network on startup and cache the result locally.
 *
 * @param {string} network - The name of the network (e.g., 'polygon', 'ethereum').
 * @param {string} apiKey - Your generated API key from the dashboard.
 * @returns {Promise<Array<object>|null>} A list of token objects or null on error.
 */
async function getAllTokensByNetwork(network, apiKey) {
  const baseUrl = 'https://<YOUR_APP_URL>'; // Replace with your application's actual URL
  const url = `${baseUrl}/api/tokens/${network.toLowerCase()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`API Error (${response.status}): ${errorData.error}`);
      return null;
    }
    // The response is an array of token objects.
    // Example object: { "symbol": "USDC", "name": "USD Coin", "decimals": 6, "network": "polygon", "contract": "0x...", "logo_url": "/api/cdn/logo/usd-coin/usdc" }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch token list:', error);
    return null;
  }
}

// --- Example Usage ---
// const myApiKey = 'wevina_...'; // Your key here
// getAllTokensByNetwork('polygon', myApiKey).then(tokens => {
//   if (tokens) {
//     console.log('Fetched Polygon tokens:', tokens);
//     // Now you can cache this array in your wallet's local storage
//   }
// });
```

---

### Endpoint 2: Get a Specific Logo URL

While it's recommended to get the `logo_url` from the token metadata endpoint above, you can also fetch a logo URL directly if needed.

This endpoint intelligently finds the correct logo. **It will prioritize the `name` parameter for the lookup**, as this is more unique than the `symbol`. This is critical for differentiating tokens that share a symbol but are on different networks (e.g., "ETH" on Arbitrum vs. "ETH" on Optimism, which are represented by "Wrapped Ether" or a similar name). If a match by `name` is not found, it will fall back to searching by `symbol`.

-   **Endpoint**: `GET /api/logo`
-   **Query Parameters**:
    -   `name` (string, **required**): The full name of the token (e.g., `Wrapped Ether`).
    -   `symbol` (string, **required**): The symbol of the token (e.g., `WETH`).

#### Example Response (`GET /api/logo?name=Wrapped%20Ether&symbol=WETH`)

```json
{
  "logo_url": "/api/cdn/logo/wrapped-ether/weth"
}
```

If the logo is not found, the endpoint will return a `404 Not Found` status with an error message.

#### Example Code

```javascript
/**
 * Fetches the CDN URL for a token's logo.
 * Note: It is more efficient to use 'getAllTokensByNetwork', which already includes the logo URL.
 * Use this endpoint only if you need to fetch a logo URL independently.
 * The 'name' is the primary lookup key to ensure accuracy.
 *
 * @param {string} tokenName - The full name of the token (e.g., 'Wrapped Ether').
 * @param {string} tokenSymbol - The symbol of the token (e.g., 'WETH').
 * @param {string} apiKey - Your generated API key.
 * @returns {Promise<string|null>} The logo's CDN-managed URL or null on error.
 */
async function getLogoUrl(tokenName, tokenSymbol, apiKey) {
    const baseUrl = 'https://<YOUR_APP_URL>'; // Replace with your application's actual URL
    const url = new URL(`${baseUrl}/api/logo`);
    url.searchParams.set('name', tokenName);
    url.searchParams.set('symbol', tokenSymbol);

    try {
        const response = await fetch(url.toString(), {
            headers: { 'x-api-key': apiKey }
        });
        if (!response.ok) {
            console.error(`API Error (${response.status}): Could not fetch logo.`);
            return null;
        }
        const data = await response.json();
        // This returns a URL path like: /api/cdn/logo/wrapped-ether/weth
        // Your app should prepend its own domain to use it.
        return data.logo_url;
    } catch (error) {
        console.error('Failed to fetch logo URL:', error);
        return null;
    }
}

// --- Example Usage ---
// const myApiKey = 'wevina_...'; // Your key here
// getLogoUrl('Wrapped Ether', 'WETH', myApiKey).then(url => {
//   if (url) {
//     console.log('Fetched logo URL:', 'https://<YOUR_APP_URL>' + url);
//   }
// });
```

---

### Important: How Logo URLs are Served

The URLs provided by these endpoints (e.g., `/api/cdn/logo/...`) point to a caching proxy layer within this application. This means:

1.  **Performance**: Responses are cached for speed.
2.  **Abstraction**: The underlying storage (Supabase Storage) is hidden from the end-user.
3.  **Consistency**: You always get a clean, consistent URL format.

Your application should treat these relative URLs as the source of truth and prepend its own domain to construct the full, usable image URL.