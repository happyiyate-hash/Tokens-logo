
import type { Network } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NetworkSelector } from "@/components/admin/network-selector";
import { UploadForm } from "@/components/admin/upload-form";


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

export default async function UploadTokenPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {

  const networks = await getNetworks();
  const selectedNetworkId = (searchParams.network as string) ?? (networks[0]?.id || "");

  return (
    <div className="w-full space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Upload Token Manually
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          A quick way to add or update a token by providing its details and logo directly.
        </p>
      </div>

       <div className="flex items-center">
         <NetworkSelector networks={networks} selectedNetworkId={selectedNetworkId} />
      </div>
      
      <UploadForm networkId={selectedNetworkId} />

    </div>
  );
}
