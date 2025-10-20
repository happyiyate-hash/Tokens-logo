
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-md">
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-card-foreground">
        Admin Dashboard
      </h1>
      <p className="text-base text-muted-foreground mb-6">
        This is your central hub for managing token logos, networks, and API keys for your Decentralized Content Delivery Network.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-primary/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-primary mb-2">
            Add New Token
          </h2>
          <p className="text-primary/80">
            A smart, two-step process to add a new token by fetching its on-chain data.
          </p>
           <Link href="/admin/add-token" className="mt-3 inline-block">
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
           <Link href="/admin/tokens" className="mt-3 inline-block">
            <Button variant="secondary">Manage Tokens</Button>
          </Link>
        </div>
        <div className="bg-purple-100/10 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-purple-300 mb-2">
            Manage Networks
          </h2>
          <p className="text-purple-400">
            Add and remove supported blockchain networks for the CDN.
          </p>
          <Link href="/admin/networks" className="mt-3 inline-block">
            <Button variant="secondary">Manage Networks</Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 p-6 bg-background rounded-lg border-l-4 border-border">
        <h3 className="text-xl font-semibold text-card-foreground mb-3">
          Admin Workflow:
        </h3>
        <ol className="list-decimal list-inside text-muted-foreground space-y-2">
          <li>
            Use "Manage Networks" to add supported blockchain networks.
          </li>
          <li>
            Use the "Add Token" or "Upload Logo" wizards to populate your token library.
          </li>
          <li>
            "Manage Tokens" and "Manage Logos" allow you to view and edit your collection.
          </li>
          <li>
            The public-facing user dashboard will consume the data you manage here.
          </li>
        </ol>
      </div>
    </div>
  );
}
