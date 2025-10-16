import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { getApiKey } from "@/lib/actions";

export default async function SettingsPage() {
  const initialApiKey = await getApiKey();

  return (
    <div className="container mx-auto px-4 py-12 md:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your API key and other application settings.
          </p>
        </div>

        <ApiKeyManager initialApiKey={initialApiKey} />
      </div>
    </div>
  );
}
