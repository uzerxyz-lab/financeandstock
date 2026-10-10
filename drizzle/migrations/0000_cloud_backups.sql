CREATE TABLE public.cloud_backups (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_backups TO authenticated;
GRANT ALL ON public.cloud_backups TO service_role;
ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backup select" ON public.cloud_backups FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own backup insert" ON public.cloud_backups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own backup update" ON public.cloud_backups FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own backup delete" ON public.cloud_backups FOR DELETE TO authenticated USING (auth.uid() = user_id);