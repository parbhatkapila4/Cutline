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
  owner_id UUID NOT NULL,
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