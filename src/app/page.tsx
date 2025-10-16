
import { UploadForm } from "@/components/admin/upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UploadTokenPage() {

  return (
    <div className="flex flex-col gap-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Upload Token
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Upload a new token logo and its metadata.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
