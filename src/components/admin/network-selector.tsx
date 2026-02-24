
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Network } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface NetworkSelectorProps {
  networks: Pick<Network, "id" | "name">[];
  selectedNetworkId: string;
}

export function NetworkSelector({
  networks,
  selectedNetworkId,
}: NetworkSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleValueChange = (networkId: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    // The special value "all" corresponds to clearing the filter
    if (networkId === "all") {
      current.delete("network");
    } else {
      current.set("network", networkId);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";

    router.push(`${pathname}${query}`);
  };

  // As per your correct analysis, filter out any invalid network data
  const validNetworks = networks?.filter(net => net.id && net.name);

  // If the URL param is missing, we are showing "All".
  // The Select component's value needs to match the SelectItem value.
  const displayValue = selectedNetworkId || "all";

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="network-selector" className="text-lg">
        Network:
      </Label>
      <Select value={displayValue} onValueChange={handleValueChange}>
        <SelectTrigger id="network-selector" className="w-[280px]">
          <SelectValue placeholder="Select a network" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Networks</SelectItem>
          {validNetworks.map((network) => (
            <SelectItem key={network.id} value={network.id}>
              {network.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
