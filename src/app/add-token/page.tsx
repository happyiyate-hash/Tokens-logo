
import { createClient } from "@supabase/supabase-js";
import { AddTokenWizard } from "@/components/admin/add-token-wizard";
import type { Network } from "@/lib/types";

// Consistent server-side Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getNetworks(): Promise<Network[]> {
  const { data, error } = await supabase.from("networks").select("*").order('name', { ascending: true });

  if (error) {
    console.error("Error fetching networks:", error);
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
                <p className="text-muted-foreground">A two-step process to add a token by fetching its metadata first.</p>
            </div>
            
            <AddTokenWizard networks={networks} />

        </div>
    )
}
