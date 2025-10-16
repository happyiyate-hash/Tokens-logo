import Image from "next/image";
import type { Token } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  return (
    <Card className="w-full max-w-md overflow-hidden shadow-lg transition-all hover:shadow-xl">
      <CardHeader className="flex flex-row items-center gap-4">
        <Image
          src={token.logo_url}
          alt={`${token.name} logo`}
          width={64}
          height={64}
          className="rounded-full bg-muted"
          data-ai-hint="token logo"
          unoptimized // Required for external URLs that are not in next.config.ts images domains
        />
        <div>
          <CardTitle className="text-2xl font-bold">{token.name}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            ${token.symbol}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Chain</span>
          <Badge variant="secondary" className="capitalize">
            {token.chain}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Decimals</span>
          <span className="font-mono text-sm font-medium">{token.decimals}</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Contract Address</p>
          <p className="w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
            {token.contract}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Logo URL</p>
          <p className="w-full break-all rounded-lg border bg-secondary/50 p-3 font-code text-xs">
            {token.logo_url}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
