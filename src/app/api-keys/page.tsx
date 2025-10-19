
"use client";

import { useState } from "react";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const getTokensByNetworkCode = `
/**
 * Fetches all tokens for a given network using your API key.
 *
 * @param {string} network - The name of the network (e.g., 'polygon', 'ethereum').
 * @param {string} apiKey - Your generated API key from the dashboard.
 * @returns {Promise<Array<object>|null>} A list of token objects or null on error.
 */
async function getAllTokensByNetwork(network, apiKey) {
  const baseUrl = window.location.origin; // Uses your app's URL dynamically
  const url = \`\${baseUrl}/api/tokens/\${network.toLowerCase()}\`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(\`API Error (\${response.status}): \${errorData.error}\`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch token list:', error);
    return null;
  }
}

// --- Example ---
// const myApiKey = 'wevina_...'; // Your key here
// getAllTokensByNetwork('polygon', myApiKey).then(tokens => {
//   if (tokens) {
//     console.log('Fetched Polygon tokens:', tokens);
//     // Now you can cache this array in your wallet's local storage
//   }
// });
`;

const getTokenBySymbolCode = `
/**
 * Fetches a single token by its symbol on a specific network.
 *
 * @param {string} network - The network name (e.g., 'ethereum').
 * @param {string} symbol - The token symbol (e.g., 'USDT').
 * @param {string} apiKey - Your generated API key.
 * @returns {Promise<object|null>} A single token object or null if not found.
 */
async function getTokenBySymbol(network, symbol, apiKey) {
  const baseUrl = window.location.origin;
  const url = new URL(\`\${baseUrl}/api/tokens/\${network.toLowerCase()}\`);
  url.searchParams.set('symbol', symbol);

  try {
    const response = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey }
    });
    if (!response.ok) {
      // ... error handling ...
      return null;
    }
    return await response.json();
  } catch (error) {
    // ... error handling ...
    return null;
  }
}

// --- Example ---
// const myApiKey = 'wevina_...'; // Your key here
// getTokenBySymbol('ethereum', 'USDT', myApiKey).then(token => {
//   if (token) {
//     console.log('USDT on Ethereum:', token);
//     // token.logo_url will point to your CDN
//   }
// });
`;

const getLogoUrlCode = `
/**
 * Fetches the CDN URL for a token's logo.
 * It's often better to use getAllTokensByNetwork which already includes the logo URL.
 *
 * @param {string} tokenName - The full name of the token (e.g., 'Wrapped Ether').
 * @param {string} tokenSymbol - The symbol of the token (e.g., 'WETH').
 * @param {string} apiKey - Your generated API key.
 * @returns {Promise<string|null>} The logo's CDN-managed URL or null.
 */
async function getLogoUrl(tokenName, tokenSymbol, apiKey) {
    const baseUrl = window.location.origin;
    const url = new URL(\`\${baseUrl}/api/logo\`);
    url.searchParams.set('name', tokenName);
    url.searchParams.set('symbol', tokenSymbol);

    try {
        const response = await fetch(url.toString(), {
            headers: { 'x-api-key': apiKey }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.logo_url; // This is a URL like /api/cdn/logo/wrapped-ether/weth
    } catch (error) {
        return null;
    }
}
`;

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto text-sm font-code">
        <code>{code.trim()}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={handleCopy}
        title="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}


export default function ApiKeysPage() {

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Web API Integration Guide
        </h1>
        <p className="text-muted-foreground">
          Use this guide to connect external applications to your CDN via the Web API using generated keys.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Use the Web API</CardTitle>
          <CardDescription>
            Your CDN provides powerful API endpoints to fetch token metadata and logos. To use them, generate an API key below and include it in the `x-api-key` header of your requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <Accordion type="single" collapsible className="w-full" defaultValue="endpoint-1">
                <AccordionItem value="endpoint-1">
                    <AccordionTrigger className="text-lg font-medium">Endpoint 1: Get All Tokens for a Network</AccordionTrigger>
                    <AccordionContent className="prose prose-invert max-w-none text-muted-foreground space-y-4">
                        <p>This is the most important endpoint. It fetches a complete list of all tokens for a given network, with their logos already linked. Your wallet should call this for each supported network on startup and cache the result locally.</p>
                        <p className="font-semibold">Endpoint: <code className="font-bold text-card-foreground">GET /api/tokens/[network]</code></p>
                        <CodeSnippet code={getTokensByNetworkCode} />
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="endpoint-2">
                    <AccordionTrigger className="text-lg font-medium">Endpoint 2: Get a Single Token by Symbol</AccordionTrigger>
                    <AccordionContent className="space-y-6">
                        <p className="text-muted-foreground">To get information for just one token, you can add its symbol as a query parameter.</p>
                        <p className="font-semibold">Endpoint: <code className="font-bold text-card-foreground">GET /api/tokens/[network]?symbol=[symbol]</code></p>
                        <div className="space-y-2">
                            <CodeSnippet code={getTokenBySymbolCode} />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="endpoint-3" className="border-b-0">
                    <AccordionTrigger className="text-lg font-medium">Endpoint 3: Get a Logo URL</AccordionTrigger>
                    <AccordionContent className="space-y-6">
                        <p className="text-muted-foreground">While it's recommended to get the logo URL from the token metadata endpoints, you can also fetch a logo URL directly. This endpoint returns the path to your caching CDN layer.</p>
                        <p className="font-semibold">Endpoint: <code className="font-bold text-card-foreground">GET /api/logo?name=[name]&symbol=[symbol]</code></p>
                         <div className="space-y-2">
                            <CodeSnippet code={getLogoUrlCode} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Generate & Manage API Keys</CardTitle>
            <CardDescription>
                Create and manage the API keys needed to access the endpoints described above.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <ApiKeyManager />
        </CardContent>
      </Card>
    </div>
  );
}

    