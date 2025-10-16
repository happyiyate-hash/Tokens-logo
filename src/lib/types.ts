export type Token = {
  id: string;
  name: string;
  symbol: string;
  contract?: string; // Contract is now optional
  chains: string[]; // Added chains array
  decimals: number;
  logo_url: string;
  updated_at: string;
};
