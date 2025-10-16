import { TokenSearch } from "@/components/token-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const sampleSymbol = "USDT";
  const sampleUrl = `/api/token/${sampleSymbol}`;

  const sampleJsonResponse = `{
  "name": "Tether",
  "symbol": "USDT",
  "decimals": 6,
  "chains": ["ethereum", "polygon"],
  "logo_url": "https://..."
}`;

  return (
    <div className="container grid grid-cols-1 lg:grid-cols-2 gap-12 px-4 py-12 md:py-24">
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Token Logo API
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            A centralized API to serve token logos and metadata for your crypto applications.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">GET Request</p>
              <p className="text-sm text-muted-foreground">
                Fetch token data by making a GET request to the following endpoint.
              </p>
              <pre className="mt-2 w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
                <code>/api/token/[symbol]</code>
              </pre>
            </div>
            <div>
              <p className="font-medium">Example</p>
              <p className="text-sm text-muted-foreground">
                Here&apos;s an example using Tether&apos;s symbol:
              </p>
              <pre className="mt-2 w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
                <a href={sampleUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {sampleUrl}
                </a>
              </pre>
            </div>
            <div>
              <p className="font-medium">Sample Response</p>
               <pre className="mt-2 w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
                <code>
                  {sampleJsonResponse}
                </code>
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center pt-0 lg:pt-16">
        <TokenSearch />
      </div>
    </div>
  );
}
