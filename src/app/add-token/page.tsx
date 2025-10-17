
import { AddTokenWizard } from "@/components/admin/add-token-wizard";
import type { Network } from "@/lib/types";
import chainsConfig from "@/lib/chains.json";

// The Network type needs a unique ID for keys and values, which chainId provides.
// We also need to map the chainId to the name for the backend action.
// Let's create a simplified type for the dropdown component.
type DropdownNetwork = {
  id: string; // Use chainId as the unique ID for the component
  name: string;
};

// This function now reads directly from the chains.json file
// and formats it for use in the AddTokenWizard component.
async function getNetworks(): Promise<DropdownNetwork[]> {
  const networks = chainsConfig.map(chain => ({
    id: chain.chainId.toString(), // Use the chainId as the unique identifier
    name: chain.name,
  }));
  
  // Sort networks alphabetically by name
  networks.sort((a, b) => a.name.localeCompare(b.name));

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
