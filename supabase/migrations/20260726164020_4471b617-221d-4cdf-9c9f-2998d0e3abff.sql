
CREATE TYPE public.analysis_type AS ENUM ('scam','voice','chat','email','url','qr','knowledge');

CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.analysis_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  risk INT NOT NULL DEFAULT 0 CHECK (risk BETWEEN 0 AND 100),
  confidence INT NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analyses_user_created_idx ON public.analyses (user_id, created_at DESC);
CREATE INDEX analyses_user_fav_idx ON public.analyses (user_id, favorite) WHERE favorite = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
