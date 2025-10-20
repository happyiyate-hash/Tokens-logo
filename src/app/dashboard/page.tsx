
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UserDashboardPage() {
  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-md">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-card-foreground">
        Welcome to Your Token CDN Dashboard!
      </h1>
      <p className="text-base md:text-lg text-muted-foreground mb-4">
        This is your central hub for accessing token logos and API keys for your wallet or application.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-primary/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-primary mb-2">
            View Token Library
          </h2>
          <p className="text-primary/80">
            Browse the complete collection of tokens and networks available in the CDN.
          </p>
           <Link href="/tokens" className="mt-3 inline-block">
             <Button variant="secondary">View Tokens</Button>
          </Link>
        </div>
        <div className="bg-green-100/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-green-300 mb-2">
            Browse Global Logos
          </h2>
          <p className="text-green-400">
            See all the master logos that are used across different networks.
          </p>
           <Link href="/logos" className="mt-3 inline-block">
            <Button variant="secondary">Browse Logos</Button>
          </Link>
        </div>
        <div className="bg-purple-100/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-purple-300 mb-2">
            Get API Keys
          </h2>
          <p className="text-purple-400">
            Generate and manage API keys for integrating the CDN into your application.
          </p>
          <Link href="/api-keys" className="mt-3 inline-block">
            <Button variant="secondary">Manage API Keys</Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 p-6 bg-background rounded-lg border-l-4 border-border">
        <h3 className="text-xl font-semibold text-card-foreground mb-3">
          How to Integrate:
        </h3>
        <ol className="list-decimal list-inside text-muted-foreground space-y-2">
          <li>
            Go to the "API Keys" page to generate a new key for your application.
          </li>
          <li>
            Follow the "Developer API Guide" on that page to learn how to use the endpoints.
          </li>
          <li>
            Use the API to fetch token metadata and logo URLs for any supported network.
          </li>
          <li>
            The "Tokens" and "Logos" pages are read-only views of the entire library managed by the administrator.
          </li>
        </ol>
      </div>
    </div>
  );
}
