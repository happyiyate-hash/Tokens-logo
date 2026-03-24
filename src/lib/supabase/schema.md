# Supabase Database Schema for Token CDN

This document provides all the necessary SQL statements to set up a new Supabase project for the Token CDN application.

You can run these queries in the Supabase SQL Editor for your new project.

---

## 1. Create Storage Bucket

First, you need to create a public storage bucket named `token_logos`.

Go to `Storage` in your Supabase dashboard and create a new bucket.

- **Bucket Name**: `token_logos`
- **Public bucket**: Check this box to make it public.

Alternatively, you can run this SQL in the editor:
```sql
-- Create the public bucket for token logos
insert into storage.buckets (id, name, public)
values ('token_logos', 'token_logos', true);

-- Add policies for public read access
CREATE POLICY "Public read access for all files" ON storage.objects
FOR SELECT USING (bucket_id = 'token_logos');

-- Add policies for allowing the backend (service_role) to manage files
CREATE POLICY "Allow admin uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'token_logos' AND role() = 'service_role');

CREATE POLICY "Allow admin updates" ON storage.objects
FOR UPDATE WITH CHECK (bucket_id = 'token_logos' AND role() = 'service_role');

CREATE POLICY "Allow admin deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'token_logos' AND role() = 'service_role');
```

---

## 2. Create Database Tables

Run the following SQL queries to create the necessary tables.

### `api_clients` Table
Stores the API keys for external applications.
```sql
CREATE TABLE public.api_clients (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_name text NOT NULL,
    api_key text NOT NULL UNIQUE,
    role text NULL DEFAULT 'client'::text,
    is_active boolean NULL DEFAULT true,
    created_at timestamptz NULL DEFAULT now(),
    last_used_at timestamptz NULL
);

-- RLS should be kept DISABLED for this table, as it is only accessed by the backend service role.
```

### `networks` Table
Stores information about the supported blockchain networks.
```sql
CREATE TABLE public.networks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    chain_id bigint NOT NULL UNIQUE,
    logo_url text NULL,
    explorer_api_base_url text NULL,
    explorer_api_key_env_var text NULL,
    created_at timestamptz NULL DEFAULT now()
);
```

### `token_logos` Table
Stores the master list of all token logos.
```sql
CREATE TABLE public.token_logos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL,
    name text NULL,
    public_url text NOT NULL,
    storage_path text NOT NULL,
    description text NULL,
    created_at timestamptz NULL DEFAULT now(),
    CONSTRAINT token_logos_name_symbol_key UNIQUE (name, symbol)
);
```

### `token_metadata` Table
Stores metadata for each token on a specific network.
```sql
CREATE TABLE public.token_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address text NOT NULL,
    network text NOT NULL,
    token_details jsonb NOT NULL,
    logo_key text NULL,
    logo_url text NULL,
    verified boolean NULL DEFAULT false,
    source text NULL,
    fetched_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT token_metadata_contract_address_network_key UNIQUE (contract_address, network)
);
```

### `pwa_apps` Table
Stores metadata for externally hosted Progressive Web Apps.
```sql
CREATE TABLE public.pwa_apps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NULL,
    app_url text NOT NULL,
    icon_url text NOT NULL,
    storage_path text NOT NULL,
    created_at timestamptz NULL DEFAULT now()
);
```


---

## 3. Create Database Functions (RPC)

These functions are called by the application to fetch data.

### `get_all_token_logos`
Fetches all global token logos.
```sql
CREATE OR REPLACE FUNCTION public.get_all_token_logos()
RETURNS TABLE(
    id uuid,
    symbol text,
    name text,
    public_url text,
    storage_path text,
    description text,
    created_at timestamptz
)
LANGUAGE sql
AS $$
  SELECT
    l.id,
    l.symbol,
    l.name,
    l.public_url,
    l.storage_path,
    l.description,
    l.created_at
  FROM public.token_logos l
  ORDER BY l.name, l.symbol;
$$;
```

### `get_tokens_by_network_id`
Fetches all tokens for a given network UUID.
```sql
CREATE OR REPLACE FUNCTION public.get_tokens_by_network_id(net_id uuid)
RETURNS SETOF token_metadata
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT tm.*
    FROM public.token_metadata AS tm
    INNER JOIN public.networks AS n ON tm.network = lower(n.name)
    WHERE n.id = net_id
    ORDER BY tm.updated_at DESC;
END;
$$;
```

---

## 4. Enable Row Level Security (RLS)

These policies allow the client-side application to safely read public data. Run these for each table that needs to be accessible from the user's browser.

### Enable RLS on `networks`
```sql
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public read access for all users"
ON public.networks FOR SELECT
USING (true);
```

### Enable RLS on `token_logos`
```sql
ALTER TABLE public.token_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public read access for all users"
ON public.token_logos FOR SELECT
USING (true);
```

### Enable RLS on `token_metadata`
```sql
ALTER TABLE public.token_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public read access for all users"
ON public.token_metadata FOR SELECT
USING (true);
```

### Enable RLS on `pwa_apps`
```sql
ALTER TABLE public.pwa_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public read access for all users on pwa_apps"
ON public.pwa_apps FOR SELECT
USING (true);
```


---

After running all these SQL commands in your new Supabase project, the database will be ready for the application. You can then update the environment variables in your project with your new Supabase URL and keys.
