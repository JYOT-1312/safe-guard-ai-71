
-- chat_sessions
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cs_own_all ON public.chat_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_cs_user_updated ON public.chat_sessions(user_id, updated_at DESC);
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- chat_messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY cm_own_select ON public.chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY cm_own_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()
  ));
CREATE POLICY cm_own_delete ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_cm_session_created ON public.chat_messages(session_id, created_at);

-- api_logs (admin-read, user-write-own)
CREATE TABLE public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tool text NOT NULL,
  model text,
  tokens_in integer,
  tokens_out integer,
  latency_ms integer,
  status text NOT NULL DEFAULT 'ok',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.api_logs TO authenticated;
GRANT ALL ON public.api_logs TO service_role;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
-- Only admins can read logs
CREATE POLICY al_admin_select ON public.api_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- Any signed-in user can insert a row about themselves (server fns run as the caller)
CREATE POLICY al_own_insert ON public.api_logs FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE INDEX idx_al_created ON public.api_logs(created_at DESC);
CREATE INDEX idx_al_tool ON public.api_logs(tool, created_at DESC);
