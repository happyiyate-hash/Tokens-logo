
"use client";

import { NetworkForm } from "@/components/admin/network-form";
import { DeleteNetworkButton } from "@/components/admin/delete-network-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Network } from "@/lib/types";
import Image from "next/image";
import { UploadNetworkLogoDialog } from "@/components/admin/upload-network-logo-dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useEffect, useState } from "react";

const defaultLogo = PlaceHolderImages.find(p => p.id === 'default-token-logo')!;


async function getNetworks(): Promise<Network[]> {
  const { data, error } = await supabaseAdmin
    .from("networks")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[ Client ] Error fetching networks:", error);
    return [];
  }

  return data;
}

export default function NetworkManagementPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNetworks().then(data => {
      setNetworks(data);
      setLoading(false);
    })
  }, []);

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Manage Blockchain Networks
        </h1>
        <p className="text-muted-foreground">
          Add or remove supported networks and upload their official logos for the wallet app.
        </p>
      </div>

      <NetworkForm />

      <div className="bg-card p-8 rounded-lg shadow-md">
        <h3 className="text-xl font-medium mb-4">Existing Networks</h3>
        {loading ? (
          <p className="text-muted-foreground">Loading networks...</p>
        ) : networks.length === 0 ? (
          <p className="text-muted-foreground">
            No networks added yet. Use the form above to add one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Chain ID</TableHead>
                  <TableHead>Network ID</TableHead>
                  <TableHead>Explorer API URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {networks.map((network) => (
                  <TableRow key={network.id}>
                    <TableCell>
                      <div 
                        className="flex items-center gap-2"
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <Image
                            src={network.logo_url || defaultLogo.imageUrl}
                            alt={`${network.name} logo`}
                            width={32}
                            height={32}
                            className="rounded-full bg-muted object-cover aspect-square pointer-events-none"
                            unoptimized
                        />
                        <UploadNetworkLogoDialog network={network} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{network.name}</TableCell>
                    <TableCell>{network.chain_id}</TableCell>
                    <TableCell className="font-code text-xs">
                      {network.id}
                    </TableCell>
                    <TableCell className="font-code text-xs">
                      {network.explorer_api_base_url}
                    </TableCell>
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
