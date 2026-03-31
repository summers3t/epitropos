import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeCaseLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawName = requestUrl.searchParams.get("name") ?? "";
  const name = rawName.trim();

  if (!name) {
    return NextResponse.json(
      { isDuplicate: false },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { isDuplicate: false },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  const { data, error } = await supabase
    .from("screening_requests")
    .select("name")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalizedName = normalizeCaseLabel(name);

  const isDuplicate = (data ?? []).some((row) => {
    return normalizeCaseLabel(row.name ?? "") === normalizedName;
  });

  return NextResponse.json(
    { isDuplicate },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
