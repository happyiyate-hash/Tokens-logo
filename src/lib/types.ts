
export type Token = {
  id: string;
  network_id: string; // Foreign key to networks table
  name: string;
  symbol: string;
  decimals: number;
  logo_url: string;
  contract: string;
  created_at: string;
  updated_at: string;
};

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
  explorer_api_key_env_var: string;
  created_at: string;
};

export type TokenMetadata = {
    name: string;
    symbol: string;
    decimals: number;
};
