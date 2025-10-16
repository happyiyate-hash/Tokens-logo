
"use client";

import { useRouter, usePathname } from "next/navigation";
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

  const handleValueChange = (networkId: string) => {
    router.push(`${pathname}?network=${networkId}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="network-selector" className="text-lg">
        Network:
      </Label>
      <Select value={selectedNetworkId} onValueChange={handleValueChange}>
        <SelectTrigger id="network-selector" className="w-[280px]">
          <SelectValue placeholder="Select a network" />
        </SelectTrigger>
        <SelectContent>
          {networks.map((network) => (
            <SelectItem key={network.id} value={network.id}>
              {network.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
