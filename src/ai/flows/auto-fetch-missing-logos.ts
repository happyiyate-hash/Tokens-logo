
'use server';

/**
 * @fileOverview A flow to automatically fetch missing token logos from CoinGecko using AI.
 *
 * - autoFetchMissingLogo - A function that initiates the process of fetching missing logos.
 * - AutoFetchMissingLogoInput - The input type for the autoFetchMissingLogo function.
 * - AutoFetchMissingLogoOutput - The return type for the autoFetchMissingLogo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { fetchLogoFromCoinGeckoBySymbol } from '@/lib/fetchers';


const AutoFetchMissingLogoInputSchema = z.object({
  tokenSymbol: z.string().describe('The symbol of the token for which to fetch the logo (e.g., "WETH").'),
  tokenName: z.string().describe('The name of the token (e.g., "Wrapped Ether"). This provides context.'),
});
export type AutoFetchMissingLogoInput = z.infer<typeof AutoFetchMissingLogoInputSchema>;

const AutoFetchMissingLogoOutputSchema = z.object({
  logoUrl: z.string().nullable().describe('The URL of the fetched token logo, or null if not found.'),
});
export type AutoFetchMissingLogoOutput = z.infer<typeof AutoFetchMissingLogoOutputSchema>;

export async function autoFetchMissingLogo(
  input: AutoFetchMissingLogoInput
): Promise<AutoFetchMissingLogoOutput> {
  return autoFetchMissingLogoFlow(input);
}

const findLogoTool = ai.defineTool({
  name: 'findLogoTool',
  description: 'Searches for a token logo URL from external sources like CoinGecko using the token symbol. Use the token name for context if the symbol is ambiguous.',
  inputSchema: z.object({
    symbol: z.string().describe('The symbol of the token (e.g., "BTC", "ETH", "USDT").'),
  }),
  outputSchema: z.string().nullable(),
},
async ({ symbol }) => {
  try {
    // In a real scenario, you might have multiple sources.
    // We are using the fetcher function directly here.
    const logoUrl = await fetchLogoFromCoinGeckoBySymbol(symbol);
    return logoUrl;
  } catch (error) {
    console.error(`Error fetching logo for ${symbol}:`, error);
    return null;
  }
});


const autoFetchMissingLogoFlow = ai.defineFlow(
  {
    name: 'autoFetchMissingLogoFlow',
    inputSchema: AutoFetchMissingLogoInputSchema,
    outputSchema: AutoFetchMissingLogoOutputSchema,
    system: "You are an expert at finding cryptocurrency token logos. Your task is to use the provided tools to find a logo URL for a given token, using both its name and symbol for context to find the most accurate match.",
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `Find the logo for the token with Name: "${input.tokenName}" and Symbol: "${input.tokenSymbol}". Prioritize using the findLogoTool. If the tool returns a valid URL, output it directly. If the tool fails or returns null, you must return null.`,
      model: 'googleai/gemini-pro',
      tools: [findLogoTool],
      output: {
        schema: AutoFetchMissingLogoOutputSchema,
      }
    });

    const toolChoice = llmResponse.choices[0].toolCalls?.[0];

    if (toolChoice && toolChoice.tool.name === 'findLogoTool') {
      const logoUrl = await toolChoice.tool.fn(toolChoice.input);
      return { logoUrl: logoUrl ?? null };
    }

    // Fallback if the model doesn't use the tool as expected
    const directOutput = llmResponse.output();
    if(directOutput?.logoUrl) {
      return directOutput;
    }

    return { logoUrl: null };
  }
);

    