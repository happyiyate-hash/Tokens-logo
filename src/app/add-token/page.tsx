
import { AddTokenWizard } from "@/components/admin/add-token-wizard";
import { supabaseAdmin } from "@/lib/supabase/admin";

// We can simplify this. The component only needs the id and name.
type DropdownNetwork = {
  id: string; // The UUID from the 'networks' table
  name: string;
};

// This function now reads from the 'networks' table in Supabase
async function getNetworks(): Promise<DropdownNetwork[]> {
    const { data, error } = await supabaseAdmin
        .from("networks")
        .select("id, name") // Select the UUID 'id' and 'name'
        .order("name", { ascending: true });
    
    if (error) {
        console.error("[AddTokenPage] Error fetching networks:", error);
        return [];
    }
    
    // The data is already in the correct format { id, name }
    return data;
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

    