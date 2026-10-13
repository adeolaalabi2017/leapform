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

  await db.insert(responses).values({
    id: nanoid(16),
    formId,
    answers: result.cleaned,
    completed: true,
    userAgent: req.headers.get("user-agent"),
    referrer: req.headers.get("referer"),
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
