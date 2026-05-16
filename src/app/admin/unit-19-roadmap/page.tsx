import { redirect } from "next/navigation";
import Unit19RoadmapWorkspace from "@/components/admin/Unit19RoadmapWorkspace";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_OWNER_EMAIL = "summers3t@gmail.com";

export default async function AdminUnit19RoadmapPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/admin/unit-19-roadmap");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, email")
        .eq("id", user.id)
        .maybeSingle();

    if (
        profileError ||
        !profile ||
        profile.role !== "admin" ||
        profile.email !== ALLOWED_OWNER_EMAIL
    ) {
        redirect("/dashboard");
    }

    return (
        <Unit19RoadmapWorkspace
            userName={
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                profile.email
            }
            userAvatarUrl={user.user_metadata?.avatar_url || null}
        />
    );
}