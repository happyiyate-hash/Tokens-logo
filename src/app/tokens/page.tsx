
import { createClient } from "@supabase/supabase-js";
import type { TokenMetadata, Network } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteTokenButton } from "@/components/admin/delete-token-button";
import { NetworkSelector } from "@/components/admin/network-selector";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

// Consistent server-side Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getTokens(networkId: string): Promise<TokenMetadata[]> {
  if (!networkId) {
    return [];
  }
  
  // First, get the network name from its ID
  const { data: networkData, error: networkError } = await supabase
    .from("networks")
    .select("name")
    .eq("id", networkId)
    .single();
    
  if (networkError || !networkData) {
      console.error("Error fetching network name:", networkError);
      return [];
  }
  
  const { data, error } = await supabase
    .from("token_metadata")
    .select("*")
    .eq("network", networkData.name.toLowerCase())
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }

  return data;
}

async function getNetworks(): Promise<Network[]> {
  const { data, error } = await supabase
    .from("networks")
    .select("id, name")
    .order("name");
  if (error) {
    console.error("Error fetching networks:", error);
    return [];
  }
  return data;
}

export default async function TokensListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const networks = await getNetworks();
  const selectedNetworkId =
    (searchParams.network as string) ?? (networks[0]?.id || "");
  const tokens = await getTokens(selectedNetworkId);
  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);


  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Manage Tokens
            </h1>
            <p className="text-muted-foreground">
            Select a network to view and manage its registered tokens.
            </p>
        </div>
         <Link href="/add-token">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Token
            </Button>
        </Link>
      </div>

      <div className="flex items-center">
         <NetworkSelector networks={networks} selectedNetworkId={selectedNetworkId} />
      </div>

      <div className="bg-card p-8 rounded-lg shadow-md">
        <h3 className="text-xl font-medium mb-4">
            Tokens on {selectedNetwork?.name || 'Selected Network'}
        </h3>
        {tokens.length === 0 ? (
          <p className="text-muted-foreground">
            No tokens found for this network. Use the 'Add New Token' button to add one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Contract Address</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <Image
                        src={token.logo_url || `https://picsum.photos/seed/${token.id}/40/40`}
                        alt={`${token.token_details.name} logo`}
                        width={40}
                        height={40}
                        className="rounded-full bg-muted"
                        unoptimized
                      />
                    </TableCell>
                    <TableCell className="font-medium">{token.token_details.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{token.token_details.symbol}</Badge>
                    </TableCell>
                    <TableCell className="font-code text-xs">
                        {token.contract_address.substring(0, 10)}...{token.contract_address.substring(token.contract_address.length - 8)}
                    </TableCell>
                    <TableCell>{token.token_details.decimals}</TableCell>
                    <TableCell className="text-right">
                      <DeleteTokenButton tokenId={token.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
