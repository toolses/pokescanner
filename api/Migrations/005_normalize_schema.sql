-- PokéScanner – normalize schema: global cards + per-user ownership
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Global cards reference table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
    tcgdex_card_id  TEXT PRIMARY KEY,
    card_name       TEXT NOT NULL,
    set_id          TEXT,
    set_name        TEXT,
    local_id        TEXT,
    rarity          TEXT,
    card_image_url  TEXT,
    category        TEXT,
    hp              INTEGER,
    types           TEXT[],
    illustrator     TEXT,
    stage           TEXT,
    evolve_from     TEXT,
    description     TEXT,
    set_logo        TEXT,
    set_symbol      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_set ON cards (set_id);

-- ── 2. Per-user collection (ownership + user-specific data) ───────────────
CREATE TABLE IF NOT EXISTS user_collection (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tcgdex_card_id  TEXT NOT NULL REFERENCES cards(tcgdex_card_id) ON DELETE CASCADE,
    variant         TEXT NOT NULL DEFAULT 'normal',
    condition       TEXT NOT NULL DEFAULT 'near_mint',
    quantity        INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    scan_image_url  TEXT,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_collection_user ON user_collection (user_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_card ON user_collection (user_id, tcgdex_card_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_collection_unique
    ON user_collection (user_id, tcgdex_card_id, variant);

ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own collection' AND tablename = 'user_collection') THEN
    CREATE POLICY "Users manage own collection" ON user_collection
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins read all collection' AND tablename = 'user_collection') THEN
    CREATE POLICY "Admins read all collection" ON user_collection
        FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- ── 3. Per-user wishlist ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_wishlist (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tcgdex_card_id  TEXT NOT NULL REFERENCES cards(tcgdex_card_id) ON DELETE CASCADE,
    priority        INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_user ON user_wishlist (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_wishlist_unique
    ON user_wishlist (user_id, tcgdex_card_id);

ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own wishlist' AND tablename = 'user_wishlist') THEN
    CREATE POLICY "Users manage own wishlist" ON user_wishlist
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins read all wishlist' AND tablename = 'user_wishlist') THEN
    CREATE POLICY "Admins read all wishlist" ON user_wishlist
        FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- ── 4. Add user_id to expert_sessions ─────────────────────────────────────
ALTER TABLE expert_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_expert_sessions_user ON expert_sessions (user_id);

ALTER TABLE expert_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own sessions' AND tablename = 'expert_sessions') THEN
    CREATE POLICY "Users manage own sessions" ON expert_sessions
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. Add user_id to api_usage_logs ──────────────────────────────────────
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_logs (user_id);

-- ── 6. Migrate existing data ──────────────────────────────────────────────
-- 6a. Copy unique card metadata from collection_cards → cards
INSERT INTO cards (tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
                   card_image_url, category, hp, types, illustrator, stage, evolve_from,
                   description, created_at)
SELECT DISTINCT ON (tcgdex_card_id)
       tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
       card_image_url, category, hp, types, illustrator, stage, evolve_from,
       description, added_at
FROM collection_cards
WHERE tcgdex_card_id IS NOT NULL
ORDER BY tcgdex_card_id, added_at
ON CONFLICT (tcgdex_card_id) DO NOTHING;

-- 6b. Copy unique card metadata from wishlist_cards → cards (fill in missing)
INSERT INTO cards (tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
                   card_image_url, set_logo, set_symbol, created_at)
SELECT DISTINCT ON (tcgdex_card_id)
       tcgdex_card_id, card_name, set_id, set_name, local_id, rarity,
       card_image_url, set_logo, set_symbol, added_at
FROM wishlist_cards
WHERE tcgdex_card_id IS NOT NULL
ORDER BY tcgdex_card_id, added_at
ON CONFLICT (tcgdex_card_id) DO UPDATE SET
    set_logo   = COALESCE(cards.set_logo, EXCLUDED.set_logo),
    set_symbol = COALESCE(cards.set_symbol, EXCLUDED.set_symbol);

-- 6c. Copy ownership rows from collection_cards → user_collection
-- Assign to the first registered user; skip if no users exist yet.
INSERT INTO user_collection (id, tcgdex_card_id, variant, condition, quantity, notes, scan_image_url, added_at, user_id)
SELECT cc.id, cc.tcgdex_card_id, cc.variant, cc.condition, cc.quantity, cc.notes, cc.scan_image_url, cc.added_at,
       u.id
FROM collection_cards cc
CROSS JOIN (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
WHERE cc.tcgdex_card_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6d. Copy wishlist rows → user_wishlist
INSERT INTO user_wishlist (id, tcgdex_card_id, priority, notes, added_at, user_id)
SELECT wc.id, wc.tcgdex_card_id, wc.priority, wc.notes, wc.added_at,
       u.id
FROM wishlist_cards wc
CROSS JOIN (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
WHERE wc.tcgdex_card_id IS NOT NULL
ON CONFLICT DO NOTHING;
