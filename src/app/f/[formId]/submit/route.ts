import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";
import { validateSubmission } from "@/lib/validate";

type Ctx = { params: Promise<{ formId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { formId } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));

  if (!form) return NextResponse.json({ ok: false }, { status: 404 });
  if (form.status !== "published" || !form.publishedSchema) {
    return NextResponse.json({ ok: false, errors: [] }, { status: 403 });
  }

  const schema = normalizeSchema(form.publishedSchema);
  const body = await req.json().catch(() => ({}));
  const result = validateSubmission(schema, body);

  if (!result.ok) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  const sessionId =
    typeof (body as { sessionId?: unknown }).sessionId === "string"
      ? ((body as { sessionId: string }).sessionId).slice(0, 40)
      : null;

  const now = new Date();
  const headers = { userAgent: req.headers.get("user-agent"), referrer: req.headers.get("referer") };

  if (sessionId) {
    // Merge into the partial row created while the respondent was filling in.
    const [existing] = await db.select().from(responses).where(eq(responses.id, sessionId));
    if (existing && !existing.completed) {
      await db
        .update(responses)
        .set({
          answers: result.cleaned,
          completed: true,
          userAgent: headers.userAgent,
          referrer: headers.referrer,
          updatedAt: now,
        })
        .where(eq(responses.id, sessionId));
      return NextResponse.json({ ok: true });
    }
    // existing.completed → this browser session already submitted once; store as a new response
  }

  await db.insert(responses).values({
    // reuse the session id only when it's free; otherwise mint a fresh id
    id: sessionId && !(await db.select().from(responses).where(eq(responses.id, sessionId))).length
      ? sessionId
      : nanoid(16),
    formId,
    answers: result.cleaned,
    completed: true,
    userAgent: headers.userAgent,
    referrer: headers.referrer,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true });
}
