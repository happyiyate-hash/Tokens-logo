
import { createClient } from "@supabase/supabase-js";
import type { Network } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NetworkForm } from "@/components/admin/network-form";
import { DeleteNetworkButton } from "@/components/admin/delete-network-button";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function getNetworks(): Promise<Network[]> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return [];
  }
  const { data, error } = await supabase.from("networks").select("*").order('name', { ascending: true });

  if (error) {
    console.error("Error fetching networks:", error);
    return [];
  }

  return data;
}

export default async function NetworkManagementPage() {
    const networks = await getNetworks();

    return (
        <div className="w-full space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Manage Blockchain Networks</h1>
                <p className="text-muted-foreground">Add or remove supported networks for your token CDN.</p>
            </div>

            <NetworkForm />

            <div className="bg-card p-8 rounded-lg shadow-md">
                 <h3 className="text-xl font-medium mb-4">Existing Networks</h3>
                {networks.length === 0 ? (
                    <p className="text-muted-foreground">No networks added yet. Use the form above to add one.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Chain ID</TableHead>
                            <TableHead>Explorer API URL</TableHead>
                             <TableHead>API Key ENV Var</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {networks.map((network) => (
                            <TableRow key={network.id}>
                                <TableCell className="font-medium">{network.name}</TableCell>
                                <TableCell>{network.chain_id}</TableCell>
                                <TableCell className="font-code text-xs">{network.explorer_api_base_url}</TableCell>
                                <TableCell className="font-code text-xs">{network.explorer_api_key_env_var}</TableCell>
                                <TableCell className="text-right">
                                 <DeleteNetworkButton networkId={network.id} />
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
