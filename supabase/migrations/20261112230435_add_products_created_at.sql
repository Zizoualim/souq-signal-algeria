/*
# Add created_at to products

1. Modified Tables
- `products`: add `created_at` (timestamptz, not null, default now()) to match
  the generated TypeScript types.
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
