-- Binder feature
CREATE TABLE IF NOT EXISTS user_binders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    name                TEXT NOT NULL,
    art_card_tcgdex_id  TEXT,
    art_card_image_url  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_binders_user ON user_binders(user_id);

CREATE TABLE IF NOT EXISTS binder_cards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    binder_id        UUID NOT NULL REFERENCES user_binders(id) ON DELETE CASCADE,
    tcgdex_card_id   TEXT NOT NULL,
    card_name        TEXT NOT NULL,
    card_image_url   TEXT,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(binder_id, tcgdex_card_id)
);

CREATE INDEX IF NOT EXISTS idx_binder_cards_binder ON binder_cards(binder_id);
