
import type { TokenMetadata, Network } from "@/lib/types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteTokenButton } from "@/components/admin/delete-token-button";
import { NetworkSelector } from "@/components/admin/network-selector";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const defaultLogo = PlaceHolderImages.find(p => p.id === 'default-token-logo')!;


async function getTokens(networkId: string): Promise<TokenMetadata[]> {
  let query = supabaseAdmin.from("token_metadata").select("*");

  // If a specific network is selected, filter by it.
  if (networkId) {
    // First, get the network name from its ID
    const { data: networkData, error: networkError } = await supabaseAdmin
      .from("networks")
      .select("name")
      .eq("id", networkId)
      .single();

    if (networkError || !networkData) {
      console.error("Error fetching network name:", networkError);
      // If network lookup fails, return empty or handle as needed
      return [];
    }
    
    query = query.eq("network", networkData.name.toLowerCase());
  }

  // Always order by the most recently updated.
  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }

  return data;
}

async function getNetworks(): Promise<Network[]> {
  const { data, error } = await supabaseAdmin
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
  const selectedNetworkId = (searchParams.network as string) ?? "";
  const tokens = await getTokens(selectedNetworkId);
  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);

  const pageTitle = selectedNetworkId && selectedNetwork ? `Tokens on ${selectedNetwork.name}` : "All Tokens";

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
        <div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Manage Tokens
            </h1>
            <p className="text-muted-foreground">
            Select a network to filter, or view all tokens in your collection.
            </p>
        </div>
         <div className="flex gap-2">
            <Link href="/add-token">
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add (Auto)
                </Button>
            </Link>
            <Link href="/upload-token">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Upload (Manual)
                </Button>
            </Link>
        </div>
      </div>

      <div className="flex items-center">
         <NetworkSelector networks={networks} selectedNetworkId={selectedNetworkId} />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">
            {pageTitle}
        </h3>
        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
              <h3 className="text-xl font-semibold tracking-tight">No Tokens Found</h3>
              <p className="text-muted-foreground mt-2">
                Tokens you add will appear here. Use the buttons above to get started.
              </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {tokens.map((token) => (
              <Card key={token.id} className="group relative flex flex-col overflow-hidden">
                <CardHeader className="flex-col items-center justify-center p-4">
                   <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                    <Image
                        src={token.logo_url || defaultLogo.imageUrl}
                        alt={`${token.token_details.name} logo`}
                        fill
                        className="rounded-full bg-muted object-cover"
                        unoptimized
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-1 p-4 pt-0 text-center">
                   <CardTitle className="text-base sm:text-lg font-bold truncate">{token.token_details.name}</CardTitle>
                   <div className="flex justify-center items-center gap-2">
                     <Badge variant="secondary">{token.token_details.symbol}</Badge>
                     <Badge variant="outline">{token.network}</Badge>
                   </div>
                </CardContent>
                 <CardFooter className="p-2 bg-muted/50">
                   <p className="text-xs text-muted-foreground truncate w-full px-2 font-mono">
                      {token.contract_address || 'No contract'}
                   </p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteTokenButton tokenId={token.id} />
                    </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
