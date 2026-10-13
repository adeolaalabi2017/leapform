import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { forms } from "@/db/schema";
import FormRunner from "@/components/FormRunner";
import { normalizeSchema, normalizeTheme } from "@/lib/form-types";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [form] = await db.select().from(forms).where(eq(forms.id, id));
  if (!form) notFound();

  const schema = normalizeSchema(form.draftSchema);
  const theme = normalizeTheme(form.theme);

  return (
    <div className="h-screen">
      <FormRunner schema={schema} theme={theme} isPreview />
    </div>
  );
}
