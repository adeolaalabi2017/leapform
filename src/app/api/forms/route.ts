import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import { DEFAULT_THEME, emptyForm, normalizeSchema, normalizeTheme } from "@/lib/form-types";
import { TEMPLATES } from "@/lib/templates";
import { checkPublicRate } from "@/lib/rate-limit";

export async function GET() {
  const rows = await db
    .select({
      id: forms.id,
      title: forms.title,
      status: forms.status,
      updatedAt: forms.updatedAt,
    })
    .from(forms)
    .orderBy(desc(forms.updatedAt));
  return NextResponse.json({ forms: rows });
}

export async function POST(req: Request) {
  if (!checkPublicRate(req, "mutate")) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const id = nanoid(12);
  let schema = emptyForm();
  let theme = DEFAULT_THEME;
  let title = schema.title;

  // Optional: start from a template ({"templateId": "nps", ...})
  const body = (await req.json().catch(() => ({}))) as { templateId?: unknown };
  if (typeof body.templateId === "string" && body.templateId) {
    const tpl = TEMPLATES.find((t) => t.id === body.templateId);
    if (!tpl) {
      return NextResponse.json({ error: "Unknown template" }, { status: 404 });
    }
    schema = normalizeSchema(tpl.schema);
    theme = normalizeTheme(tpl.theme);
    title = tpl.name;
  }

  await db.insert(forms).values({
    id,
    title,
    draftSchema: schema,
    theme,
  });
  return NextResponse.json({ id });
}
