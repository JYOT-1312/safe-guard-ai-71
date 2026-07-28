import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export async function listSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSession(title = "New chat"): Promise<ChatSession> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: u.user.id, title })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function renameSession(id: string, title: string): Promise<void> {
  const { error } = await supabase.from("chat_sessions").update({ title: title.slice(0, 120) }).eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function loadMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function appendMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    user_id: u.user.id,
    role,
    content,
  });
  if (error) throw error;
  await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
}

export function summarizeTitle(firstUserMessage: string): string {
  const t = firstUserMessage.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57) + "…" : t || "New chat";
}
