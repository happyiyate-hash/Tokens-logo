import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { getApiKey } from "@/lib/actions";

export default async function ApiKeysPage() {
  const initialApiKey = await getApiKey();

  return (
    <div className="w-full">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          API Keys
        </h1>
        <p className="text-muted-foreground">
          Manage your API key for accessing the token logo API.
        </p>
      </div>

      <ApiKeyManager initialApiKey={initialApiKey} />
    </div>
  );
}
