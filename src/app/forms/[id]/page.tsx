import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import Builder, { type BuilderForm } from "@/components/Builder";
import { normalizeSchema, normalizeTheme } from "@/lib/form-types";

export const dynamic = "force-dynamic";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const builderForm: BuilderForm = {
    id: form.id,
    title: form.title,
    status: form.status,
    draftSchema: normalizeSchema(form.draftSchema),
    theme: normalizeTheme(form.theme),
    publishedSchema: form.publishedSchema ? normalizeSchema(form.publishedSchema) : null,
    notifyEmail: form.notifyEmail,
  };

  return <Builder form={builderForm} />;
}
