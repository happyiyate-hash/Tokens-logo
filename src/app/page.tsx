
import { UploadForm } from "@/components/admin/upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminPage() {
  const apiUrl = `/api/token/{symbol}`;
  const exampleUrl = `/api/token/USDT`;

  return (
    <div className="container grid grid-cols-1 lg:grid-cols-2 items-start justify-center gap-8 px-4 py-12 md:py-24">
      <div className="flex flex-col gap-8">
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Token Logo CDN
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            A private admin panel to manage token logos for your applications.
          </p>
        </div>
        <UploadForm />
      </div>

      <Card className="w-full max-w-lg sticky top-24">
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            Use this endpoint to fetch token metadata and logos in your applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">Endpoint</h3>
            <p className="w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
              GET {apiUrl}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Headers</h3>
            <pre className="w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
              <code>{`{ "x-api-key": "YOUR_SECRET_API_KEY" }`}</code>
            </pre>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Example Request</h3>
            <p className="w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
              GET {exampleUrl}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Example Success Response</h3>
            <pre className="w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
              <code>
                {JSON.stringify(
                  {
                    symbol: "USDT",
                    name: "Tether",
                    decimals: 6,
                    chains: ["ethereum", "polygon"],
                    logo_url:
                      "https://<your-project>.supabase.co/storage/v1/object/public/logos/usdt.png",
                  },
                  null,
                  2
                )}
              </code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
