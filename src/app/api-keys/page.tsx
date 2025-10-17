
"use client";

import { useState } from "react";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

const codeSnippet = `
// Example: Fetch a single token (USDT on Ethereum)
async function getToken(network, symbol, apiKey) {
  const baseUrl = window.location.origin;
  const url = new URL(\`\${baseUrl}/api/tokens/\${network}\`);
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

// Example: Fetch all tokens for a network (Polygon)
async function getAllTokens(network, apiKey) {
  const baseUrl = window.location.origin;
  const url = \`\${baseUrl}/api/tokens/\${network}\`;

  try {
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(\`API Error (\${response.status}): \${errorData.error}\`);
      return [];
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching token list:', error);
    return [];
  }
}

// Example: Fetch a logo URL (ETH on Ethereum)
async function getLogo(network, symbol, apiKey) {
    const baseUrl = window.location.origin;
    const url = new URL(\`\${baseUrl}/api/logo\`);
    url.searchParams.set('network', network);
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
// // 1. Get a single token
// getToken('ethereum', 'USDT', apiKey).then(token => console.log('Single Token:', token));
//
// // 2. Get all tokens on a network
// getAllTokens('polygon', apiKey).then(tokens => console.log('All Polygon Tokens:', tokens));
//
// // 3. Get a specific logo
// getLogo('ethereum', 'WETH', apiKey).then(logoUrl => console.log('WETH Logo URL:', logoUrl));
`;

export default function ApiKeysPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          API Keys
        </h1>
        <p className="text-muted-foreground">
          Manage your API keys for accessing the token logo service.
        </p>
      </div>

      <ApiKeyManager />

      <Card>
        <CardHeader>
          <CardTitle>How to Integrate</CardTitle>
          <CardDescription>
            Use the following Javascript functions in your crypto wallet or DApp
            to fetch token data using a generated API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
