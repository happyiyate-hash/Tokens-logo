
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Main table for storing token metadata fetched from blockchains
create table if not exists "token_metadata" (
    "id" uuid primary key default uuid_generate_v4(),
    "contract_address" text not null,
    "network" text not null,
    "token_details" jsonb not null,
    "logo_url" text,
    "verified" boolean not null default false,
    "source" text,
    "fetched_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    unique ("contract_address", "network")
);
comment on table "token_metadata" is 'Stores metadata for tokens on various blockchains, including contract address, network, and token details like name, symbol, and decimals.';

-- Master library for globally available token logos
create table if not exists "token_logos" (
    "id" uuid primary key default uuid_generate_v4(),
    "symbol" text not null unique,
    "name" text,
    "public_url" text not null,
    "storage_path" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now()
);
comment on table "token_logos" is 'A global library of token logos, identified by a unique symbol. This table serves as the origin for the CDN.';

-- Table for managing API clients and their keys
create table if not exists "api_clients" (
    "id" serial primary key,
    "client_name" text not null,
    "api_key" text not null unique default 'wevina_' || substr(md5(random()::text), 0, 32),
    "role" text not null default 'client',
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "last_used_at" timestamp with time zone
);
comment on table "api_clients" is 'Manages API keys for clients accessing the CDN services.';

-- Table for managing supported blockchain networks
create table if not exists "networks" (
    "id" uuid primary key default uuid_generate_v4(),
    "name" text not null unique,
    "chain_id" bigint not null unique,
    "logo_url" text,
    "explorer_api_base_url" text not null,
    "explorer_api_key_env_var" text,
    "created_at" timestamp with time zone not null default now()
);
comment on table "networks" is 'Stores information about the blockchain networks supported by the CDN.';

-- Create storage bucket for logos if it doesn't exist
-- Note: This part is illustrative. Bucket creation is typically done via the Supabase dashboard.
-- However, we can define policies on it here.
-- Assuming a bucket named 'token_logos' exists.

-- Policies for the 'token_logos' bucket
-- Allow public read access to everyone
create policy "Public read access for all logos"
on storage.objects for select
using ( bucket_id = 'token_logos' );

-- Allow authenticated users to upload/update/delete (more secure)
-- For simplicity in this setup, we rely on the service_role key for admin actions from the backend.
-- A more granular policy would be:
-- create policy "Allow authenticated uploads"
-- on storage.objects for insert
-- with check ( bucket_id = 'token_logos' and auth.role() = 'authenticated' );

-- RPC function to generate a new API key for a client
create or replace function generate_api_key(p_client_name text)
returns text
language plpgsql
security definer -- Important: runs with the privileges of the function owner
as $$
declare
    new_key text;
begin
    insert into public.api_clients (client_name)
    values (p_client_name)
    returning api_key into new_key;
    
    return new_key;
end;
$$;

-- RPC function to get all token logos
create or replace function get_all_token_logos()
returns setof token_logos
language sql
stable
as $$
    select * from public.token_logos order by symbol asc;
$$;

-- Add indexes for performance
create index if not exists idx_token_metadata_contract_network on token_metadata(contract_address, network);
create index if not exists idx_token_metadata_symbol on token_metadata using gin ((token_details -> 'symbol'));
create index if not exists idx_token_logos_symbol on token_logos(symbol);
create index if not exists idx_networks_name on networks(name);
create index if not exists idx_api_clients_key on api_clients(api_key);
