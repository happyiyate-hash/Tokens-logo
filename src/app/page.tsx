
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-md">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-card-foreground">
        Welcome to Your DCDN Dashboard!
      </h1>
      <p className="text-base md:text-lg text-muted-foreground mb-4">
        This is your central hub for managing token logos and API keys for your
        Decentralized Content Delivery Network.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-primary/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-primary mb-2">
            Add New Token
          </h2>
          <p className="text-primary/80">
            A smart, two-step process to add a new token by fetching its on-chain data.
          </p>
           <Link href="/add-token" className="mt-3 inline-block">
             <Button variant="secondary">Add a Token</Button>
          </Link>
        </div>
        <div className="bg-green-100/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-green-300 mb-2">
            Manage Tokens
          </h2>
          <p className="text-green-400">
            View, edit, and remove existing token logos by network.
          </p>
           <Link href="/tokens" className="mt-3 inline-block">
            <Button variant="secondary">Manage Tokens</Button>
          </Link>
        </div>
        <div className="bg-purple-100/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-purple-300 mb-2">
            API Keys
          </h2>
          <p className="text-purple-400">
            Generate and manage API keys for wallet integration.
          </p>
          <Link href="/api-keys" className="mt-3 inline-block">
            <Button variant="secondary">Manage API Keys</Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 p-6 bg-background rounded-lg border-l-4 border-border">
        <h3 className="text-xl font-semibold text-card-foreground mb-3">
          How it Works:
        </h3>
        <ol className="list-decimal list-inside text-muted-foreground space-y-2">
          <li>
            First, add your supported blockchain networks under "Manage Networks".
          </li>
          <li>
            Use the "Add Token" wizard to fetch token metadata from the blockchain.
          </li>
          <li>
            Your CDN (backend) will store these logos and make them accessible
            via unique URLs.
          </li>
          <li>Generate an API key from the "API Keys" page.</li>
          <li>
            Integrate this API key into your crypto wallet or DApp to fetch token data.
          </li>
        </ol>
      </div>
    </div>
  );
}
