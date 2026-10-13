import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import FormRunner from "@/components/FormRunner";
import { normalizeSchema, normalizeTheme } from "@/lib/form-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ formId: string }> }): Promise<Metadata> {
  const { formId } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));
  const title = form?.publishedSchema && typeof (form.publishedSchema as { title?: unknown }).title === "string"
    ? (form.publishedSchema as { title: string }).title
    : (form?.title ?? "Leapform");
  return { title };
}

export default async function PublicFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, formId));

  if (!form || form.status !== "published" || !form.publishedSchema) notFound();

  const schema = normalizeSchema(form.publishedSchema);
  const theme = normalizeTheme(form.theme);

  return (
    <div className="h-screen">
      <FormRunner schema={schema} theme={theme} formId={form.id} />
    </div>
  );
}
