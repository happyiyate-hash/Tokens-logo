
import { UploadForm } from "@/components/admin/upload-form";

export default async function UploadTokenPage() {

  return (
    <div className="w-full space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Upload a Global Token Logo
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Upload a logo and provide its details. This logo will be linked to the symbol globally and can be used across all networks.
        </p>
      </div>
      
      <UploadForm />

    </div>
  );
}
