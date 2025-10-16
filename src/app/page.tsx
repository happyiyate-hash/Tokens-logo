import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="bg-white dark:bg-card p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-card-foreground">
        Welcome to Your DCDN Dashboard!
      </h1>
      <p className="text-lg text-muted-foreground mb-4">
        This is your central hub for managing token logos and API keys for your
        Decentralized Content Delivery Network.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-primary mb-2">
            Upload Logos
          </h2>
          <p className="text-primary/80">
            Add new token images with their symbols and decimal values.
          </p>
          <p className="mt-3 text-sm">
            Go to <Badge variant="secondary">Upload Token</Badge>
          </p>
        </div>
        <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">
            Manage Tokens
          </h2>
          <p className="text-green-700 dark:text-green-400">
            View, edit, and remove existing token logos.
          </p>
          <p className="mt-3 text-sm">
            Go to <Badge variant="secondary">Tokens List</Badge>
          </p>
        </div>
        <div className="bg-purple-100 dark:bg-purple-900/30 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-purple-800 dark:text-purple-300 mb-2">
            API Keys
          </h2>
          <p className="text-purple-700 dark:text-purple-400">
            Generate and manage API keys for wallet integration.
          </p>
          <p className="mt-3 text-sm">
            Go to <Badge variant="secondary">API Keys</Badge>
          </p>
        </div>
      </div>

      <div className="mt-10 p-6 bg-card/50 dark:bg-background rounded-lg border-l-4 border-border">
        <h3 className="text-xl font-semibold text-card-foreground mb-3">
          How it Works:
        </h3>
        <ol className="list-decimal list-inside text-muted-foreground space-y-2">
          <li>
            Upload your token logos with associated symbols and decimals here.
          </li>
          <li>
            Our CDN (backend) will store these logos and make them accessible
            via unique URLs.
          </li>
          <li>Generate an API key from this dashboard.</li>
          <li>
            Integrate this API key into your crypto wallet or DApp.
          </li>
          <li>
            When your wallet needs a logo, it will make a request to your CDN
            using the API key and token symbol.
          </li>
          <li>Your CDN will return the corresponding logo image.</li>
        </ol>
      </div>
    </div>
  );
}
