-- PokéScanner initial schema
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Collection cards ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_cards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tcgdex_card_id   TEXT NOT NULL,
    card_name        TEXT NOT NULL,
    set_id           TEXT,
    set_name         TEXT,
    local_id         TEXT,
    rarity           TEXT,
    card_image_url   TEXT,
    category         TEXT,
    variant          TEXT NOT NULL DEFAULT 'normal',
    condition        TEXT NOT NULL DEFAULT 'near_mint',
    quantity         INTEGER NOT NULL DEFAULT 1,
    notes            TEXT,
    scan_image_url   TEXT,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_cards_tcgdex ON collection_cards (tcgdex_card_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_set    ON collection_cards (set_id);

-- ── Wishlist cards ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_cards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tcgdex_card_id   TEXT NOT NULL,
    card_name        TEXT NOT NULL,
    set_id           TEXT,
    set_name         TEXT,
    local_id         TEXT,
    rarity           TEXT,
    card_image_url   TEXT,
    priority         INTEGER NOT NULL DEFAULT 0,
    notes            TEXT,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishlist_cards_tcgdex ON wishlist_cards (tcgdex_card_id);

-- ── Expert sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expert_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Expert messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expert_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES expert_sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    model_used  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_messages_session ON expert_messages (session_id, created_at);

-- ── API usage logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider          TEXT NOT NULL,
    endpoint          TEXT NOT NULL,
    status_code       INTEGER,
    response_time_ms  INTEGER NOT NULL,
    request_body      TEXT,
    response_body     TEXT,
    correlation_id    UUID,
    used_model        TEXT,
    total_tokens_used INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_logs (provider, created_at);

-- ── Price cache ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_cache (
    tcgdex_card_id  TEXT PRIMARY KEY,
    pricing_json    JSONB,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
