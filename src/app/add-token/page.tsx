
import { AddTokenWizard } from "@/components/admin/add-token-wizard";
import type { Network } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";


async function getNetworks(): Promise<Network[]> {
  const { data, error } = await supabaseAdmin.from("networks").select("*").order('name', { ascending: true });

  if (error) {
    console.error("[ Server ] Error fetching networks:", error);
    return [];
  }

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
