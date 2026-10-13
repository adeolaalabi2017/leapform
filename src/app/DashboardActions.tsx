"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewFormButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forms", { method: "POST" });
      const data = (await res.json()) as { id?: string };
      if (data.id) router.push(`/forms/${data.id}`);
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void create()}
      disabled={loading}
      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-60"
    >
      {loading ? "Creating…" : "+ New form"}
    </button>
  );
}

export function DeleteFormButton({ id }: { id: string }) {
  const router = useRouter();

  const del = async () => {
    if (!window.confirm("Delete this form and all of its responses? This cannot be undone.")) return;
    await fetch(`/api/forms/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <button
      onClick={() => void del()}
      title="Delete form"
      aria-label="Delete form"
      className="rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-500"
    >
      ✕
    </button>
  );
}
