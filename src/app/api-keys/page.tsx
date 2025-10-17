
"use client";

import { useState } from "react";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";


const codeSnippet = `
/**
 * Guide 1: Fetching Token Metadata
 */

/**
 * Fetches all tokens for a given network.
 * @param {string} network - The name of the network (e.g., 'ethereum', 'polygon').
 * @param {string} apiKey - Your generated API key.
 * @returns {Promise<Array<object>|null>} A list of token objects or null on error.
 */
async function getAllTokensByNetwork(network, apiKey) {
  const baseUrl = window.location.origin;
  const url = \`\${baseUrl}/api/tokens/\${network.toLowerCase()}\`;

  try {
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(\`API Error (\${response.status}): \${errorData.error}\`);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching token list:', error);
    return null;
  }
}

/**
 * Fetches a single token by its symbol on a specific network.
 * @param {string} network - The name of the network (e.g., 'ethereum').
 * @param {string} symbol - The token's symbol (e.g., 'USDT').
 * @param {string} apiKey - Your generated API key.
 * @returns {Promise<object|null>} A single token object or null on error.
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
      const errorData = await response.json();
      console.error(\`API Error (\${response.status}): \${errorData.error}\`);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
}


/**
 * Guide 2: Fetching a Token Logo
 */

/**
 * Fetches the logo URL for a token symbol.
 * This endpoint searches for the best available logo. For best results, provide
 * both a symbol and a name to avoid ambiguity with tokens that share symbols.
 * @param {string} symbol - The token's symbol (e.g., 'WETH').
 * @param {string} apiKey - Your generated API key.
 * @param {string} [name] - Optional. The token's name (e.g., 'Wrapped Ether') to find a more specific logo.
 * @returns {Promise<string|null>} The logo URL or null on error.
 */
async function getLogoBySymbol(symbol, apiKey, name) {
    const baseUrl = window.location.origin;
    const url = new URL(\`\${baseUrl}/api/logo\`);
    url.searchParams.set('symbol', symbol);
    if (name) {
      url.searchParams.set('name', name);
    }

    try {
        const response = await fetch(url.toString(), {
            headers: { 'x-api-key': apiKey }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(\`API Error (\${response.status}): \${errorData.error}\`);
            return null;
        }
        const data = await response.json();
        return data.logo_url;
    } catch (error) {
        console.error('Error fetching logo:', error);
        return null;
    }
}


// --- Example Usage ---
// const apiKey = 'wevina_...'; // Your generated API key
//
// // --- Metadata Examples ---
// // 1. Get all tokens on Polygon
// getAllTokensByNetwork('polygon', apiKey).then(tokens => {
//   console.log('All Polygon Tokens:', tokens);
// });
//
// // 2. Get a single token (USDT on Ethereum)
// getTokenBySymbol('ethereum', 'USDT', apiKey).then(token => {
//   console.log('Single Token:', token);
// });
//
//
// // --- Logo Examples ---
// // 3. Get the global logo for WETH (less specific)
// getLogoBySymbol('WETH', apiKey).then(logoUrl => {
//   console.log('Generic WETH Logo URL:', logoUrl);
// });
//
// // 4. Get a specific logo for a token named 'Tether' with symbol 'USDT' (more specific)
// getLogoBySymbol('USDT', apiKey, 'Tether').then(logoUrl => {
//   console.log('Specific USDT Logo URL:', logoUrl);
// });
`;

function CopyableInput({ id, label, value }: { id: string, label: string, value: string }) {
    const [copied, setCopied] = useState(false);
  
    const handleCopy = () => {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
  
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input id={id} value={value} readOnly className="pr-10" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
            onClick={handleCopy}
            title="Copy"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
}

export default function ApiKeysPage() {
  const [copied, setCopied] = useState(false);
  // These variables are now read from the environment by Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";


  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          API Keys & Integration Guide
        </h1>
        <p className="text-muted-foreground">
          Manage access and learn how to integrate the Token CDN into your apps.
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Project Connection Details</CardTitle>
          <CardDescription>
            These are your project's main connection details. The server uses the secret Service Role Key from your environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyableInput id="supabase-url" label="Project URL (NEXT_PUBLIC_SUPABASE_URL)" value={supabaseUrl} />
          <CopyableInput id="supabase-anon-key" label="Public Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)" value={supabaseAnonKey} />
           <div className="space-y-2">
                <Label htmlFor="supabase-service-key">Service Role Key (SUPABASE_SERVICE_ROLE_KEY)</Label>
                <Input id="supabase-service-key" placeholder="This key is kept secret on the server" readOnly value="**************************************************************************************************" />
                <p className="text-xs text-muted-foreground">This key is used for server-side operations and is not exposed to the public.</p>
            </div>
        </CardContent>
      </Card>

      <ApiKeyManager />

      <Card>
        <CardHeader>
          <CardTitle>How to Integrate: A Guide for Developers</CardTitle>
          <CardDescription>
            Use the Javascript examples below to fetch token data and logos using your generated API keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <Accordion type="single" collapsible className="w-full" defaultValue="how-it-works">
                <AccordionItem value="how-it-works">
                    <AccordionTrigger className="text-lg font-medium">How It Works</AccordionTrigger>
                    <AccordionContent className="prose prose-invert max-w-none text-muted-foreground space-y-2">
                        <p>This CDN serves as a centralized, high-performance service for your DApps and wallets to retrieve token information. Here’s the flow:</p>
                        <ol>
                            <li><strong>API Keys:</strong> Generate an API key from the manager above. Every request to the API must include this key in the <code>x-api-key</code> HTTP header.</li>
                            <li><strong>Adding Tokens:</strong> You add tokens using the "Add Token" or "Upload Logo" pages. The system stores metadata and logo URLs in a central database.</li>
                            <li><strong>API Endpoints:</strong> The CDN exposes simple REST API endpoints to query this data, which your application will call.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="api-endpoints">
                    <AccordionTrigger className="text-lg font-medium">API Endpoint Guides</AccordionTrigger>
                    <AccordionContent className="space-y-6">
                        <div className="p-4 border rounded-lg bg-background/50">
                            <h4 className="font-semibold text-card-foreground text-lg mb-2">Guide 1: Fetching Token Metadata</h4>
                            <p className="font-mono text-sm bg-muted p-2 rounded-md my-2"><code>GET /api/tokens/[network]</code></p>
                            <p className="text-muted-foreground">Returns a list of all tokens on a specific network. You can also fetch a single token by providing a symbol.</p>
                            <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-1">
                                <li><code>[network]</code> (in URL path, required): The lowercase name of the network (e.g., <code>ethereum</code>, <code>polygon</code>).</li>
                                <li><code>symbol</code> (query param, optional): If provided, returns only the token matching that symbol on the specified network.</li>
                            </ul>
                        </div>
                         <div className="p-4 border rounded-lg bg-background/50">
                            <h4 className="font-semibold text-card-foreground text-lg mb-2">Guide 2: Fetching a Token Logo</h4>
                            <p className="font-mono text-sm bg-muted p-2 rounded-md my-2"><code>GET /api/logo</code></p>
                            <p className="text-muted-foreground">Returns the best-available logo URL for a given token symbol. For best results, provide both a symbol and name to avoid conflicts.</p>
                            <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-1">
                                <li><code>symbol</code> (query param, required): The token symbol (e.g., <code>USDC</code>, <code>WETH</code>).</li>
                                <li><code>name</code> (query param, optional): The token name to find a more specific logo match (e.g., 'Tether' to differentiate from other 'USDT' tokens).</li>
                            </ul>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="code-examples">
                    <AccordionTrigger className="text-lg font-medium">Javascript Code Examples</AccordionTrigger>
                    <AccordionContent>
                         <div className="relative">
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto text-sm font-code">
                            <code>{codeSnippet.trim()}</code>
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
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
