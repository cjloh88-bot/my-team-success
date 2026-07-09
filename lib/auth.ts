import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, type TeamMember } from "@/lib/team-success";

export type CurrentProfile = {
  user: {
    id: string;
    email: string | null;
  };
  member: TeamMember;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data: existing, error } = await supabase
    .from("team_members")
    .select("*")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .limit(1)
    .maybeSingle();

  if (error) return null;

  if (existing) {
    if (!existing.user_id) {
      await supabase.from("team_members").update({ user_id: user.id }).eq("id", existing.id);
    }
    return { user: { id: user.id, email: user.email }, member: { ...existing, user_id: existing.user_id ?? user.id } as TeamMember };
  }

  const displayName =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
      ? user.user_metadata.name.trim()
      : user.email.split("@")[0];

  const { data: created } = await supabase
    .from("team_members")
    .insert({
      user_id: user.id,
      name: displayName,
      email: user.email,
      role: "member",
    })
    .select("*")
    .single();

  return created ? { user: { id: user.id, email: user.email }, member: created as TeamMember } : null;
}

export function canWrite(profile: CurrentProfile | null) {
  return profile?.member.role === "admin" || profile?.member.role === "member";
}

export function isAdmin(profile: CurrentProfile | null) {
  return profile?.member.role === "admin";
}
