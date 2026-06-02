import { redirect } from "next/navigation";
import Unit19RoadmapWorkspace from "@/components/admin/Unit19RoadmapWorkspace";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_EMAILS = new Set([
    "summers3t@gmail.com",
    "maria.brambashka@gmail.com",
]);

export default async function AdminNorthStarPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/admin/northstar");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, email, full_name")
        .eq("id", user.id)
        .maybeSingle();

    const email = profile?.email || user.email || "";

    if (profileError || !ALLOWED_EMAILS.has(email)) {
        redirect("/dashboard");
    }

    return (
        <Unit19RoadmapWorkspace
            projectSlug="maria-northstar"
            projectTitle="Maria's NorthStar"
            projectSubtitle="HAN Communication · HR / Recruitment / Employer Branding path"
            projectLabel="NorthStar"
            heroBadge="NorthStar Roadmap"
            userName={
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                profile?.full_name ||
                email
            }
            userAvatarUrl={user.user_metadata?.avatar_url || null}
        />
    );
}
