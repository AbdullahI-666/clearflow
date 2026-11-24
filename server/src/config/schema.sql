-- ============================================================
-- ClearFlow PostgreSQL Schema for Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT        NOT NULL,
  email                       TEXT        UNIQUE NOT NULL,
  password_hash               TEXT        NOT NULL,
  role                        TEXT        NOT NULL CHECK (role IN ('Client', 'FieldTeam', 'Admin')),
  phone                       TEXT        NOT NULL DEFAULT '',
  is_verified                 BOOLEAN     DEFAULT false,
  is_active                   BOOLEAN     DEFAULT true,
  cnic                        TEXT        DEFAULT '',
  cnic_verified               BOOLEAN     DEFAULT false,
  verification_status         TEXT        DEFAULT 'None',
  address                     TEXT        DEFAULT '',
  city                        TEXT        DEFAULT '',
  service_categories          TEXT[]      DEFAULT '{}',
  experience_years            TEXT        DEFAULT '',
  failed_login_attempts       INTEGER     DEFAULT 0,
  account_locked_until        TIMESTAMPTZ,
  verification_token          TEXT,
  verification_token_expiry   TIMESTAMPTZ,
  verification_code           TEXT,
  verification_code_expiry    TIMESTAMPTZ,
  reset_password_token        TEXT,
  reset_password_expiry       TIMESTAMPTZ,
  reset_password_code         TEXT,
  reset_password_code_expiry  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. service_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS service_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        UNIQUE NOT NULL,
  description TEXT        NOT NULL,
  is_paid     BOOLEAN     DEFAULT false,
  is_waste    BOOLEAN     DEFAULT false,
  icon_url    TEXT,
  base_price  NUMERIC     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_service_categories_updated_at ON service_categories;
CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. field_teams
-- ============================================================
CREATE TABLE IF NOT EXISTS field_teams (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  category_id          UUID        REFERENCES service_categories(id),
  zone_lat             NUMERIC     NOT NULL,
  zone_lng             NUMERIC     NOT NULL,
  zone_radius_km       NUMERIC     DEFAULT 10,
  is_active            BOOLEAN     DEFAULT true,
  average_rating       NUMERIC     DEFAULT 0,
  total_jobs_completed INTEGER     DEFAULT 0,
  active_order_count   INTEGER     DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_field_teams_updated_at ON field_teams;
CREATE TRIGGER trg_field_teams_updated_at
  BEFORE UPDATE ON field_teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. field_team_members (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS field_team_members (
  team_id UUID REFERENCES field_teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

-- ============================================================
-- 5. work_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_code         TEXT        UNIQUE NOT NULL,
  title                   TEXT,
  client_id               UUID        NOT NULL REFERENCES users(id),
  team_id                 UUID        REFERENCES field_teams(id),
  category_id             UUID        NOT NULL REFERENCES service_categories(id),
  status                  TEXT        DEFAULT 'Open' CHECK (status IN ('Open','Assigned','InProgress','PendingReview','Closed','Flagged')),
  location_address        TEXT        NOT NULL,
  location_lat            NUMERIC     NOT NULL,
  location_lng            NUMERIC     NOT NULL,
  description             TEXT        NOT NULL,
  urgency                 TEXT        NOT NULL CHECK (urgency IN ('Low','Medium','High')),
  preferred_time          TEXT,
  before_image_url        TEXT,
  after_image_url         TEXT,
  before_images           TEXT[]      DEFAULT '{}',
  after_images            TEXT[]      DEFAULT '{}',
  client_feedback         JSONB,
  admin_inspection        JSONB,
  progress_percentage     INTEGER     DEFAULT 0,
  progress_stage          TEXT        DEFAULT 'Work Not Started',
  budget                  NUMERIC,
  marketplace_status      TEXT        DEFAULT 'Draft' CHECK (marketplace_status IN ('Draft','Bidding','Assigned','InProgress','Completed','Settled','Cancelled')),
  tracking_stage          TEXT        DEFAULT 'RequestCreated',
  selected_offer_id       UUID,
  offers_count            INTEGER     DEFAULT 0,
  settlement_details      JSONB,
  cancellation_reason     TEXT,
  is_waste_category       BOOLEAN     DEFAULT false,
  waste_type              TEXT,
  waste_quantity_kg       NUMERIC,
  is_accepted             BOOLEAN     DEFAULT false,
  accepted_at             TIMESTAMPTZ,
  accepted_by             TEXT,
  rejection_reason        TEXT,
  ai_confidence_score     NUMERIC,
  ai_result               TEXT,
  ai_verification_details JSONB,
  pdf_report_url          TEXT,
  assigned_at             TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON work_orders;
CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id    UUID        UNIQUE NOT NULL REFERENCES work_orders(id),
  team_id          UUID        NOT NULL REFERENCES field_teams(id),
  method           TEXT        NOT NULL CHECK (method IN ('Auto','Manual')),
  proximity_score  NUMERIC,
  workload_score   NUMERIC,
  rating_score     NUMERIC,
  composite_score  NUMERIC,
  overridden_by    UUID        REFERENCES users(id),
  override_reason  TEXT,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID        UNIQUE NOT NULL REFERENCES work_orders(id),
  client_id     UUID        NOT NULL REFERENCES users(id),
  invoice_code  TEXT        UNIQUE NOT NULL,
  amount        NUMERIC     NOT NULL,
  subtotal      NUMERIC,
  tax           NUMERIC     DEFAULT 0,
  currency      TEXT        DEFAULT 'PKR',
  status        TEXT        DEFAULT 'Issued' CHECK (status IN ('Issued','Paid','Cancelled')),
  items         JSONB,
  pdf_url       TEXT,
  issued_at     TIMESTAMPTZ DEFAULT NOW(),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id),
  work_order_id   UUID        REFERENCES work_orders(id),
  type            TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  is_read         BOOLEAN     DEFAULT false,
  channel         TEXT        DEFAULT 'Both' CHECK (channel IN ('Push','Email','Both')),
  delivery_status TEXT        DEFAULT 'Delivered' CHECK (delivery_status IN ('Pending','Delivered','Failed')),
  retry_count     INTEGER     DEFAULT 0,
  metadata        JSONB       DEFAULT '{}',
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID        NOT NULL REFERENCES work_orders(id),
  sender_id     UUID        NOT NULL REFERENCES users(id),
  sender_role   TEXT        NOT NULL CHECK (sender_role IN ('Client','FieldTeam','Admin')),
  message       TEXT        NOT NULL,
  is_read       BOOLEAN     DEFAULT false,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. gps_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS gps_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID        NOT NULL REFERENCES field_teams(id),
  work_order_id    UUID        REFERENCES work_orders(id),
  lat              NUMERIC     NOT NULL,
  lng              NUMERIC     NOT NULL,
  accuracy_meters  NUMERIC,
  recorded_at      TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- 11. marketplace_offers
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_offers (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id            UUID        NOT NULL REFERENCES work_orders(id),
  technician_id            UUID        NOT NULL REFERENCES users(id),
  team_id                  UUID        REFERENCES field_teams(id),
  technician_name          TEXT        NOT NULL,
  technician_phone         TEXT,
  technician_rating        NUMERIC     DEFAULT 5.0,
  technician_jobs_completed INTEGER    DEFAULT 0,
  offer_price              NUMERIC     NOT NULL,
  proposed_eta_minutes     INTEGER     DEFAULT 15,
  distance_km              NUMERIC     DEFAULT 1.5,
  message                  TEXT,
  counter_price            NUMERIC,
  counter_message          TEXT,
  status                   TEXT        DEFAULT 'Pending' CHECK (status IN ('Pending','Accepted','Rejected','Countered','Cancelled')),
  points_committed         INTEGER     DEFAULT 15,
  accepted_at              TIMESTAMPTZ,
  rejected_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_marketplace_offers_updated_at ON marketplace_offers;
CREATE TRIGGER trg_marketplace_offers_updated_at
  BEFORE UPDATE ON marketplace_offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 12. field_member_wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS field_member_wallets (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        UNIQUE NOT NULL REFERENCES users(id),
  points_balance        NUMERIC     DEFAULT 50,
  is_available_online   BOOLEAN     DEFAULT true,
  wallet_balance        NUMERIC     DEFAULT 0.0,
  pending_balance       NUMERIC     DEFAULT 0,
  withdrawable_balance  NUMERIC     DEFAULT 0.0,
  total_earnings        NUMERIC     DEFAULT 0.0,
  total_commission_paid NUMERIC     DEFAULT 0.0,
  search_radius_km      NUMERIC     DEFAULT 15,
  current_lat           NUMERIC     DEFAULT 31.4697,
  current_lng           NUMERIC     DEFAULT 74.2728,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_field_member_wallets_updated_at ON field_member_wallets;
CREATE TRIGGER trg_field_member_wallets_updated_at
  BEFORE UPDATE ON field_member_wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 13. wallet_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id),
  work_order_id      UUID        REFERENCES work_orders(id),
  type               TEXT        NOT NULL CHECK (type IN ('JobEarning','AdminCommission','BonusReward','Withdrawal','WithdrawalRefund','Adjustment')),
  amount             NUMERIC     NOT NULL,
  balance_after      NUMERIC     NOT NULL,
  status             TEXT        DEFAULT 'Completed' CHECK (status IN ('Pending','Completed','Rejected')),
  withdrawal_details JSONB,
  description        TEXT        NOT NULL,
  metadata           JSONB       DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. points_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id),
  work_order_id UUID        REFERENCES work_orders(id),
  type          TEXT        NOT NULL CHECK (type IN ('InitialGrant','JobWonDeduction','JobCancellationRefund','BonusReward','AdminAdjustment')),
  points_change INTEGER     NOT NULL,
  balance_after INTEGER     NOT NULL,
  reason        TEXT        NOT NULL,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. bonus_rewards
-- ============================================================
CREATE TABLE IF NOT EXISTS bonus_rewards (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id),
  work_order_id    UUID        REFERENCES work_orders(id),
  bonus_type       TEXT        NOT NULL CHECK (bonus_type IN ('HighRating','AiQuality','Punctuality','DailyMilestone','WeeklyMilestone')),
  amount_cash      NUMERIC     DEFAULT 0,
  points_awarded   INTEGER     DEFAULT 0,
  idempotency_key  TEXT        UNIQUE NOT NULL,
  reason           TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID        UNIQUE NOT NULL REFERENCES work_orders(id),
  client_id     UUID        NOT NULL REFERENCES users(id),
  team_id       UUID        NOT NULL REFERENCES field_teams(id),
  stars         INTEGER     NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment       TEXT,
  rated_at      TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- 17. settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_confidence_threshold     NUMERIC     DEFAULT 0.75,
  gps_interval_seconds        INTEGER     DEFAULT 30,
  max_active_orders_per_team  INTEGER     DEFAULT 5,
  max_failed_login_attempts   INTEGER     DEFAULT 5,
  default_currency            TEXT        DEFAULT 'PKR',
  sla_target_hours            INTEGER     DEFAULT 4,
  auto_dispatch_enabled       BOOLEAN     DEFAULT true,
  smtp_host                   TEXT,
  smtp_user                   TEXT,
  smtp_port                   INTEGER,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 18. ai_verification_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_verification_logs (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id          UUID        UNIQUE NOT NULL REFERENCES work_orders(id),
  before_image_url       TEXT        NOT NULL,
  after_image_url        TEXT        NOT NULL,
  confidence_score       NUMERIC     NOT NULL,
  result                 TEXT        NOT NULL CHECK (result IN ('Pass','Fail','Flagged')),
  model_version          TEXT        NOT NULL,
  processing_time_ms     INTEGER,
  verified_at            TIMESTAMPTZ NOT NULL,
  metrics                JSONB,
  fraud_analysis         JSONB,
  quality_assessment     JSONB,
  findings               TEXT[],
  service_recommendation TEXT
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_work_orders_client_status    ON work_orders(client_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_status      ON work_orders(team_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_category         ON work_orders(category_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status           ON work_orders(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read      ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_chat_messages_order_sent     ON chat_messages(work_order_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_gps_logs_team_recorded       ON gps_logs(team_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_offers_order     ON marketplace_offers(work_order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_tech      ON marketplace_offers(technician_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_status    ON marketplace_offers(status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user     ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type     ON wallet_transactions(type);

CREATE INDEX IF NOT EXISTS idx_points_transactions_user     ON points_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_bonus_rewards_user           ON bonus_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_rewards_type           ON bonus_rewards(bonus_type);
