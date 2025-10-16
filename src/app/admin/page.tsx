import { UploadForm } from "@/components/admin/upload-form";

export default function AdminPage() {
  return (
    <div className="container flex flex-col items-center justify-center gap-8 px-4 py-12 md:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Admin Panel
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
          Manage your token logo CDN.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
