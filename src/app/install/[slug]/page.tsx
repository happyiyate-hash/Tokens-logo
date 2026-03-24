import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PwaApp } from "@/lib/types";
import { InstallPwaClient } from "@/components/user/install-pwa-client";
import { notFound } from "next/navigation";

async function getPwaApp(slug: string): Promise<PwaApp | null> {
    const { data, error } = await supabaseAdmin
        .from("pwa_apps")
        .select("*")
        .eq("slug", slug)
        .single();
    
    if (error) {
        console.error(`Error fetching PWA app with slug ${slug}:`, error);
        return null;
    }
    
    return data;
}


export default async function InstallAppPage({ params }: { params: { slug: string } }) {
    const app = await getPwaApp(params.slug);

    if (!app) {
        return notFound();
    }

    return <InstallPwaClient app={app} />;
}
