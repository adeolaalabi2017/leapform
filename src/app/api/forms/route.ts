import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import { DEFAULT_THEME, emptyForm } from "@/lib/form-types";

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

export async function POST() {
  const id = nanoid(12);
  const schema = emptyForm();
  await db.insert(forms).values({
    id,
    title: schema.title,
    draftSchema: schema,
    theme: DEFAULT_THEME,
  });
  return NextResponse.json({ id });
}
