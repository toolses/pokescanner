-- Add extra card details to collection_cards so we don't need live API lookups
ALTER TABLE collection_cards ADD COLUMN IF NOT EXISTS hp              INTEGER;
ALTER TABLE collection_cards ADD COLUMN IF NOT EXISTS types           TEXT[];
ALTER TABLE collection_cards ADD COLUMN IF NOT EXISTS illustrator     TEXT;
ALTER TABLE collection_cards ADD COLUMN IF NOT EXISTS stage           TEXT;
ALTER TABLE collection_cards ADD COLUMN IF NOT EXISTS evolve_from     TEXT;
ALTER TABLE collection_cards ADD COLUMN IF NOT EXISTS description     TEXT;
