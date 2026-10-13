"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewFormButton({
  variant = "solid",
  label = "+ New form",
}: {
  variant?: "solid" | "sand";
  label?: string;
}) {
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
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition disabled:opacity-60 ${
        variant === "sand"
          ? "bg-sand text-everest hover:bg-off-white hover:shadow-lg"
          : "bg-everest text-white hover:bg-olive"
      }`}
    >
      {loading ? "Creating…" : label}
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

/**
 * Share-menu row: copies text, shows the done state briefly, then closes.
 */
export function ShareItem({
  label,
  done,
  copied,
  onCopy,
  onDone,
}: {
  label: string;
  done: string;
  copied: string | "";
  onCopy: () => Promise<void>;
  onDone: () => void;
}) {
  const copy = async () => {
    if (copied === done) return;
    await onCopy();
    onDone();
  };
  return (
    <button
      onClick={() => void copy()}
      className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-slate-100"
    >
      {copied === done ? done : `📋 ${label}`}
    </button>
  );
}
