import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";
import { sanitizePartial } from "@/lib/validate";

type Ctx = { params: Promise<{ formId: string }> };

/** Upsert an in-progress (partial) response. completed=false until final submit. */
export async function POST(req: Request, { params }: Ctx) {
  const { formId } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  if (!form || form.status !== "published") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { sessionId?: unknown; answers?: unknown };
  const sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId.slice(0, 40) : null;
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  const schema = normalizeSchema(form.publishedSchema);
  const cleaned = sanitizePartial(schema, body);

  const [existing] = await db.select().from(responses).where(eq(responses.id, sessionId));
  if (existing) {
    if (existing.completed) return NextResponse.json({ ok: true }); // already finished
    await db
      .update(responses)
      .set({ answers: cleaned, updatedAt: new Date() })
      .where(eq(responses.id, sessionId));
  } else {
    await db.insert(responses).values({
      id: sessionId,
      formId,
      answers: cleaned,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return NextResponse.json({ ok: true });
}
