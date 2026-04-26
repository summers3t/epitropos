import { createClient } from "@/lib/supabase/server";
import ReadinessCheckClient from "./ReadinessCheckClient";

export default async function ReadinessCheckPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return <ReadinessCheckClient isLoggedIn={!!user} />;
}