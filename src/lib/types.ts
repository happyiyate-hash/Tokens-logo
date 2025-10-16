
export type Token = {
  id: string;
  name: string;
  symbol: string;
  chains: string[];
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
