
import { AddTokenWizard } from "@/components/admin/add-token-wizard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Network } from "@/lib/types";

// The Network type needs a unique ID for keys and values, which chainId provides.
// We also need to map the chainId to the name for the backend action.
// Let's create a simplified type for the dropdown component.
type DropdownNetwork = {
  id: string; // Use chainId as the unique ID for the component
  name: string;
};

// This function now reads from the 'networks' table in Supabase
async function getNetworks(): Promise<DropdownNetwork[]> {
    const { data, error } = await supabaseAdmin
        .from("networks")
        .select("chain_id, name")
        .order("name", { ascending: true });
    
    if (error) {
        console.error("[AddTokenPage] Error fetching networks:", error);
        return [];
    }

    const networks = data.map(chain => ({
        id: chain.chain_id.toString(), // Use the chainId as the unique identifier
        name: chain.name,
    }));

    return networks;
}

export default async function AddTokenPage() {
    const networks = await getNetworks();

    return (
        <div className="w-full space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Add a New Token</h1>
                <p className="text-muted-foreground">A smart, two-step process to add a token by first fetching its on-chain data and logo.</p>
            </div>
            
            <AddTokenWizard networks={networks} />

        </div>
    )
}
