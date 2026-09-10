SELECT status,
  count(*) AS rows,
  min(created_at) AS oldest,
  max(created_at) AS newest,
  count(*) FILTER (
    WHERE final_url IS NOT NULL
  ) AS with_final_url
FROM video_jobs
WHERE owner_type = 'anon'
  AND queue_job_id IS NULL
GROUP BY status
ORDER BY rows DESC;
UPDATE video_jobs
SET queue_job_id = id::text
WHERE owner_type = 'anon'
  AND queue_job_id IS NULL;
SELECT id,
  created_at,
  left(prompt, 60) AS prompt_head
FROM video_jobs
WHERE owner_type = 'anon'
  AND status = 'queued'
  AND created_at < now() - interval '48 hours'
ORDER BY created_at;
SELECT count(*) AS still_unlinked
FROM video_jobs
WHERE owner_type = 'anon'
  AND queue_job_id IS NULL;