
import { UploadForm } from "@/components/admin/upload-form";

export default function UploadTokenPage() {

  return (
    <div className="w-full space-y-8 flex flex-col items-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Upload a Global Token Logo
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Upload a logo and provide its symbol. This logo will be used across all networks for that symbol.
        </p>
      </div>
      
      <UploadForm />

    </div>
  );
}
