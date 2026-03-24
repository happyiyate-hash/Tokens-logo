
import { PwaForm } from "@/components/admin/pwa-form";

export default function PostAppsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Post a New PWA</h1>
        <p className="text-muted-foreground">
          Upload the metadata and assets for a new Progressive Web App to be hosted on the CDN.
        </p>
      </div>
      <PwaForm />
    </div>
  );
}
