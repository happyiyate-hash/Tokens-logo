
import { nextHandler } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/auto-fetch-missing-logos'; // Ensure flows are registered

// Correctly create the handler by passing the ai instance, and export GET/POST
export const { GET, POST } = nextHandler({ ai });
