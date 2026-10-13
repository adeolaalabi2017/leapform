import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, responses } from "@/db/schema";
import { normalizeSchema, normalizeTheme } from "@/lib/form-types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ form });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    schema?: unknown;
    theme?: unknown;
  };
  const schema = normalizeSchema(body.schema);
  const theme = normalizeTheme(body.theme);
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : schema.title;
  schema.title = title; // keep welcome-screen title in sync
  try {
    await db
      .update(forms)
      .set({ title, draftSchema: schema, theme, updatedAt: new Date() })
      .where(eq(forms.id, id));
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await db.delete(responses).where(eq(responses.formId, id));
    await db.delete(forms).where(eq(forms.id, id));
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
