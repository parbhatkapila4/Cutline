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

-- Manual user plan overrides (managed by admin directly in DB)
CREATE TABLE IF NOT EXISTS user_plan_overrides (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'beginner', 'professional', 'enterprise')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_plan_overrides_plan ON user_plan_overrides (plan);