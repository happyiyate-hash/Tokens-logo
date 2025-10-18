
import { AddTokenWizard } from "@/components/admin/add-token-wizard";
import chainsConfig from "@/lib/chains.json";
import type { Network } from "@/lib/types";


// We now use the hardcoded chains.json file as the single source of truth.
function getNetworks(): Omit<Network, 'explorer_api_base_url' | 'explorer_api_key_env_var' | 'created_at' | 'logo_url'>[] {
    // We only need a subset of the fields for the dropdown.
    // The wizard expects an 'id' and 'name'. We will use chainId as the 'id'.
    return chainsConfig.map(chain => ({
        id: chain.chainId.toString(),
        name: chain.name,
        chain_id: chain.chainId
    }));
}

export default async function AddTokenPage() {
    const networks = getNetworks();

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
