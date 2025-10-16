
import React from "react";
import { getApiKeys } from "@/lib/actions";

// This layout fetches the API keys on the server and passes them
// to the client page via search params as a workaround.
export default async function ApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiKeys = await getApiKeys();
  const keysJson = JSON.stringify(apiKeys);

  // We pass the fetched data as a search param.
  // This is not ideal but a common pattern for passing server data
  // to a client component page without a complex state management library.
  const childrenWithProps = React.cloneElement(children as React.ReactElement, {
    searchParams: { keys: keysJson },
  });

  return <>{childrenWithProps}</>;
}
