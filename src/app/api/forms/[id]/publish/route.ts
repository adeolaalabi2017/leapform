import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const drafting = form.draftSchema as { fields?: unknown[] } | null;
  if (!drafting || Array.isArray(drafting.fields) === false || drafting.fields!.length === 0) {
    return NextResponse.json({ error: "Add at least one question before publishing" }, { status: 400 });
  }

  await db
    .update(forms)
    .set({
      publishedSchema: form.draftSchema,
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(forms.id, id));

  return NextResponse.json({ ok: true });
}
