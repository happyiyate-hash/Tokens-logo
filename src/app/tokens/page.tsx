
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
          A list of all the tokens stored in your CDN.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Decimals</TableHead>
              <TableHead>Chains</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length > 0 ? (
              tokens.map((token) => (
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
                  <TableCell>{token.decimals}</TableCell>
                  <TableCell>
                     <div className="flex flex-wrap gap-1">
                        {token.chains.map((chain) => (
                        <Badge key={chain} variant="secondary" className="capitalize">
                            {chain}
                        </Badge>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No tokens found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
