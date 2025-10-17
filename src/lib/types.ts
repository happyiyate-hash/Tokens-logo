
export type TokenDetails = {
  name: string;
  symbol: string;
  decimals: number;
  network: string;
  contract_address: string;
  logo_key?: string;
  extra?: {
    coingecko_id?: string;
    links?: { [key: string]: string };
  };
};

export type TokenMetadata = {
  id: string;
  contract_address: string;
  network: string;
  token_details: TokenDetails;
  logo_key: string | null;
  logo_url: string | null;
  verified: boolean;
  source: string;
  fetched_at: string;
  updated_at: string;
};

export type TokenLogo = {
    id: string;
    contract: string | null;
    symbol: string | null;
    network: string;
    storage_path: string;
    public_url: string;
    uploaded_at: string;
}

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  created_at: string;
};

export type Network = {
  id: string;
  name: string;
  chain_id: number;
  explorer_api_base_url: string;
  explorer_api_key_env_var: string | null;
  created_at: string;
};

export type TokenFetchResult = {
    name: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
};

    