import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { getApiKeys } from "@/lib/actions";

export default async function ApiKeysPage() {
  const initialApiKeys = await getApiKeys();

  return (
    <div className="w-full">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          API Keys
        </h1>
        <p className="text-muted-foreground">
          Manage your API keys for accessing the token logo API.
        </p>
      </div>

      <ApiKeyManager initialApiKeys={initialApiKeys} />
    </div>
  );
}
