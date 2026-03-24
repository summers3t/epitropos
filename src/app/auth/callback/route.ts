import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSafeRedirectPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

function getUserFullName(user: {
  user_metadata?: Record<string, unknown> | null;
}) {
  const metadata = user.user_metadata ?? {};

  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fullName) return fullName;

  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";
  if (name) return name;

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = getSafeRedirectPath(requestUrl.searchParams.get("redirect"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", requestUrl.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return cookieStore.getAll();
        },
        async setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // ignore in read-only contexts
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const fullName = getUserFullName(user);

    if (fullName) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email: user.email ?? null,
        })
        .eq("id", user.id)
        .or(`full_name.is.null,full_name.eq.""`);

      if (profileUpdateError) {
        console.error("Profile hydration failed:", profileUpdateError.message);
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}