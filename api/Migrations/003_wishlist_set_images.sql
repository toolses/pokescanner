-- Add set logo and symbol to wishlist_cards for display
ALTER TABLE wishlist_cards ADD COLUMN IF NOT EXISTS set_logo TEXT;
ALTER TABLE wishlist_cards ADD COLUMN IF NOT EXISTS set_symbol TEXT;
