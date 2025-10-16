
export type Token = {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  decimals: number;
  logo_url: string;
  contract?: string; // Optional contract address
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
