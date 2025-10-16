
import { TokenSearch } from "@/components/token-search";

export default function SearchPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Search for a Token
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          Find a token in your database by its symbol (case-insensitive).
        </p>
      </div>
      <TokenSearch />
    </div>
  );
}
