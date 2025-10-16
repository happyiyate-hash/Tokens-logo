import { TokenSearch } from "@/components/token-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const sampleContract = "0xdac17f958d2ee523a2206206994597c13d831ec7";
  const sampleUrl = `/api/token/${sampleContract}`;

  const sampleJsonResponse = `{
  "id": "1",
  "name": "Tether",
  "symbol": "USDT",
  "contract": "0xdac17f958d2ee523a2206206994597c13d831ec7",
  "chain": "ethereum",
  "decimals": 6,
  "logo_url": "https://...",
  "updated_at": "2024-01-01T00:00:00Z"
}`;

  return (
    <div className="container grid grid-cols-1 lg:grid-cols-2 gap-12 px-4 py-12 md:py-24">
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Token Logo CDN
          </h1>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Your central repository for token logos and metadata. Use this service to power your crypto applications.
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
                <code>/api/token/[contractAddress]</code>
              </pre>
            </div>
            <div>
              <p className="font-medium">Example</p>
              <p className="text-sm text-muted-foreground">
                Here&apos;s an example using Tether&apos;s contract address:
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
