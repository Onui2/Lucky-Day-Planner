-- Review only. Not executed, not part of automatic application bootstrap.
CREATE TABLE IF NOT EXISTS campaign_visits (
  visit_id uuid PRIMARY KEY,
  campaign_id varchar(40) NOT NULL CHECK (campaign_id = 'new-year-2027'),
  source varchar(20) NOT NULL CHECK (source IN ('instagram', 'youtube', 'direct')),
  creative varchar(30) NOT NULL CHECK (creative IN ('input-demo', 'monthly-table', 'free-vs-paid', 'direct')),
  created_at timestamptz NOT NULL DEFAULT now(),
  input_at timestamptz,
  free_result_at timestamptz
);
CREATE INDEX IF NOT EXISTS campaign_visits_cohort_idx ON campaign_visits(campaign_id, created_at);
-- Access goes through the server's validated/rate-limited endpoints. No direct
-- client role may read all visits or bypass attribution checks with table writes.
ALTER TABLE campaign_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE campaign_visits FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE campaign_visits FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE campaign_visits FROM authenticated;
  END IF;
END;
$$;
-- Use a trusted server role with table privileges and BYPASSRLS (or the owner).
-- Do not grant that role to browsers. There are intentionally no client policies.
-- Anonymous IDs only. No birth date/time, question, IP, email, or full referrer URL.
-- Before enabling tracking, approve retention/deletion and privacy disclosure.
