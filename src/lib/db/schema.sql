CREATE TABLE IF NOT EXISTS anon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generation_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_anon_sessions_created_at ON anon_sessions (created_at);
DO $$ BEGIN CREATE TYPE video_job_status AS ENUM ('queued', 'processing', 'completed', 'failed');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE video_job_owner_type AS ENUM ('anon', 'user');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type video_job_owner_type NOT NULL,
  owner_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status video_job_status NOT NULL DEFAULT 'queued',
  preview_url TEXT,
  final_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  queue_job_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_owner ON video_jobs (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs (status);
CREATE TABLE IF NOT EXISTS user_plan_overrides (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL CHECK (
    plan IN ('free', 'beginner', 'professional', 'enterprise')
  ),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_plan_overrides_plan ON user_plan_overrides (plan);
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (
    plan IN ('beginner', 'professional', 'enterprise')
  ),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix);
CREATE TABLE IF NOT EXISTS job_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  user_id TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_comments_job_id ON job_comments (job_id);
CREATE TABLE IF NOT EXISTS job_approvals (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  actor_user_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  banned_phrases TEXT [] NOT NULL DEFAULT '{}',
  required_phrases TEXT [] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON brand_kits (user_id);
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_key TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  plan TEXT,
  provider_ref TEXT,
  dodo_customer_id TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_user ON processed_webhook_events (user_id);
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id TEXT PRIMARY KEY,
  dodo_customer_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_customers_dodo ON billing_customers (dodo_customer_id);
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  inquiry TEXT NOT NULL,
  budget TEXT NOT NULL,
  details TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    email_status IN ('pending', 'sent', 'failed')
  ),
  email_error TEXT,
  provider_message_id TEXT,
  client_identifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email_status ON contact_submissions (email_status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_queue_job_id ON video_jobs (queue_job_id);
CREATE TABLE IF NOT EXISTS render_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  stage_name TEXT,
  error_code TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_render_events_job_id ON render_events (job_id);
CREATE INDEX IF NOT EXISTS idx_render_events_user_id ON render_events (user_id);
CREATE INDEX IF NOT EXISTS idx_render_events_type_created ON render_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_render_events_stage ON render_events (stage_name);
ALTER TABLE processed_webhook_events
ADD COLUMN IF NOT EXISTS topup_seconds INTEGER;
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_ref ON processed_webhook_events (provider_ref);
ALTER TABLE render_events
ADD COLUMN IF NOT EXISTS provider_error TEXT;