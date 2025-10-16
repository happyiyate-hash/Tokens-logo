
import { createClient } from "@supabase/supabase-js";
import type { Token } from "@/lib/types";
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
import { DeleteTokenButton } from "@/components/admin/delete-token-button";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function getTokens(): Promise<Token[]> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return [];
  }
  const { data, error } = await supabase.from("tokens").select("*").order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }

  return data;
}

export default async function TokensListPage() {
  const tokens = await getTokens();

  return (
    <div className="w-full">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Tokens List
        </h1>
        <p className="text-muted-foreground">
          A list of all the tokens stored in your CDN, across all networks.
        </p>
      </div>

      <div className="bg-card p-8 rounded-lg shadow-md">
        {tokens.length === 0 ? (
          <p className="text-muted-foreground">No tokens uploaded yet. Go to "Upload Token" to add some!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <Image
                        src={token.logo_url}
                        alt={`${token.name} logo`}
                        width={40}
                        height={40}
                        className="rounded-full bg-muted"
                        unoptimized
                      />
                    </TableCell>
                    <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{token.symbol}</Badge>
                    </TableCell>
                     <TableCell>
                      <Badge variant="secondary" className="capitalize">
                          {token.chain}
                      </Badge>
                    </TableCell>
                    <TableCell>{token.decimals}</TableCell>
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
