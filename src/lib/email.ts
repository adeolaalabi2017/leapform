import type { FormSchema } from "./form-types";

const RESEND_API = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidNotifyEmail(v: string | null | undefined): v is string {
  if (!v) return false;
  return EMAIL_RE.test(v.trim());
}

/**
 * Send a submission notification. Never throws — a failing email must not
 * fail the submission that just succeeded.
 */
export async function sendSubmissionNotification(opts: {
  formId: string;
  formTitle: string;
  notifyEmail: string;
  schema: FormSchema;
  answers: Record<string, string | number>;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.NOTIFY_FROM ?? "Leapform <onboarding@resend.dev>";
  if (!apiKey || !RESEND_API) return false;

  const rows = opts.schema.fields
    .map((f) => {
      const v = opts.answers[f.id];
      if (v === undefined || v === null || v === "") return null;
      const val =
        f.type === "rating" && f.properties?.ratingStart === 0
          ? `${v} / 10`
          : String(v);
      return `<tr>
        <td style="padding:6px 14px 6px 0;color:#45644a;font-weight:600;vertical-align:top">${escapeHtml(f.title || f.id)}</td>
        <td style="padding:6px 0;color:#18442a;vertical-align:top">${escapeHtml(val)}</td>
      </tr>`;
    })
    .filter(Boolean)
    .join("");

  const formUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://leapform.vercel.app"}/forms/${opts.formId}/responses`;

  const html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:560px">
    <h2 style="color:#18442a;margin:0 0 4px">New response</h2>
    <p style="color:#45644a;margin:0 0 16px;font-size:14px">${escapeHtml(opts.formTitle)}</p>
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    <p style="margin:18px 0 0;font-size:13px">
      <a href="${formUrl}" style="color:#18442a">Open the responses dashboard →</a>
    </p>
  </div>`;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.notifyEmail],
        subject: `New response — ${opts.formTitle}`,
        html,
      }),
    });
    if (!res.ok) {
      console.warn("[leapform] notification send failed:", res.status, (await res.text().catch(() => "")));
    }
    return res.ok;
  } catch (err) {
    console.warn("[leapform] notification send error:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
