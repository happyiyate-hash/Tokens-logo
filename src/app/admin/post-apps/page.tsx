
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

export default function PostAppsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Post a New PWA</h1>
        <p className="text-muted-foreground">
          Upload the necessary files for a new Progressive Web App to be hosted on the CDN.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>PWA Uploader</CardTitle>
          <CardDescription>
            Provide the app's name and upload a zip file containing the PWA assets (index.html, manifest.json, sw.js, and icons folder).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input id="appName" name="appName" placeholder="e.g., My Awesome App" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appFiles">PWA Asset Bundle (.zip)</Label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="appFiles" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-muted-foreground">ZIP file (MAX. 10MB)</p>
                  </div>
                  <Input id="appFiles" type="file" className="hidden" accept=".zip" />
                </label>
              </div> 
            </div>
            <Button type="submit" className="w-full" disabled>Upload App (Coming Soon)</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
