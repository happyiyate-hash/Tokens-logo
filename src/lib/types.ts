
export type TokenDetails = {
  name: string;
  symbol: string;
  decimals: number;
};

export type TokenMetadata = {
  id: string;
  contract_address: string;
  network: string;
  token_details: TokenDetails;
  logo_key: string | null; // This field can be considered deprecated
  logo_url: string | null;
  verified: boolean;
  source: string;
  fetched_at: string;
  updated_at: string;
};

// This represents the new global logo table
export type TokenLogo = {
    id: string;
    symbol: string;
    name?: string | null;
    public_url: string;
    storage_path: string; 
    description?: string | null;
    created_at: string;
}

export type ApiKey = {
  id: number;
  client_name: string;
  api_key: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export type Network = {
  id: string;
  name: string;
  chain_id: number;
  logo_url?: string | null; // Add logo_url to Network type
  explorer_api_base_url: string;
  explorer_api_key_env_var: string | null;
  created_at: string;
};

export type TokenFetchResult = {
    name: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
    source?: string;
};
