import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { Loader2, Save, Trash2, ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "bn", label: "বাংলা" },
  { code: "mr", label: "मराठी" },
  { code: "gu", label: "ગુજરાતી" },
];

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rolesQ = useRoles();
  const deleteFn = useServerFn(deleteMyAccount);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: profile, isLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setLanguage(profile.language ?? "en");
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        display_name: displayName.trim().slice(0, 80) || null,
        avatar_url: avatarUrl.trim().slice(0, 500) || null,
        language,
      };
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (confirmDelete !== "DELETE") { toast.error('Type DELETE to confirm'); return; }
    setDeleting(true);
    try {
      await deleteFn({});
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  const roles = rolesQ.data ?? [];

  return (
    <AppShell title="Profile">
      <div className="p-6 lg:p-10 max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Your profile</h2>
          <p className="text-muted-foreground mt-1">Manage how you appear in SurakshaSetu AI.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="bg-white border border-border rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-brand-accent/10 text-brand-accent grid place-items-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="size-full object-cover" onError={() => setAvatarUrl("")} />
                ) : (
                  <UserIcon className="size-8" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{user?.email}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <ShieldCheck className="size-3 text-safety-green" />
                  {roles.length ? roles.join(", ") : "user"}
                </div>
              </div>
            </div>

            <Field label="Display name">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="Your name" />
            </Field>

            <Field label="Avatar URL">
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} maxLength={500}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent"
                placeholder="https://…" />
            </Field>

            <Field label="Preferred language">
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </Field>

            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 bg-brand-accent text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
            </button>
          </div>
        )}

        <div className="bg-white border-2 border-alert-red/30 rounded-3xl p-6">
          <div className="text-alert-red font-bold uppercase tracking-wider text-xs mb-2">Danger zone</div>
          <h3 className="text-lg font-semibold">Delete account</h3>
          <p className="text-sm text-muted-foreground mt-1">Permanently removes your account, profile, analysis history, and quiz results. This cannot be undone.</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder='Type DELETE to confirm'
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-alert-red"
            />
            <button onClick={onDelete} disabled={deleting || confirmDelete !== "DELETE"}
              className="px-5 py-2.5 bg-alert-red text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-40 inline-flex items-center justify-center gap-2">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete my account
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      {children}
    </label>
  );
}
