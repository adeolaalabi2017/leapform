import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms, responses } from "@/db/schema";
import { normalizeSchema } from "@/lib/form-types";
import { toCsv } from "@/lib/csv";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const schema = normalizeSchema(form.publishedSchema ?? form.draftSchema);
  const rows = await db
    .select()
    .from(responses)
    .where(eq(responses.formId, id))
    .orderBy(desc(responses.createdAt))
    .limit(2000);

  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "csv") {
    const headers = ["submitted_at", ...schema.fields.map((f) => f.title || f.id)];
    const body = rows.map((r) => [
      new Date(r.createdAt).toISOString(),
      ...schema.fields.map((f) => {
        const v = (r.answers as Record<string, unknown>)?.[f.id];
        return v === undefined || v === null ? "" : String(v);
      }),
    ]);
    return new NextResponse(toCsv(headers, body), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${form.title || "responses"}.csv"`,
      },
    });
  }

  return NextResponse.json({ responses: rows });
}
