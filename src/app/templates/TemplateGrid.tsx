"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UseTemplateButton({ templateId, name }: { templateId: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const use = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = (await res.json()) as { id?: string };
      if (data.id) router.push(`/forms/${data.id}`);
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void use()}
      disabled={loading}
      className="rounded-lg bg-everest px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-olive disabled:opacity-60"
      title={`Create a form from "${name}"`}
    >
      {loading ? "Creating…" : "Use template →"}
    </button>
  );
}
