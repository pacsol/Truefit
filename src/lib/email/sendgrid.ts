export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send an email via SendGrid.
 * Abstracts the API so it can be swapped for another provider or mocked in tests.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn("[Email] SendGrid not configured — skipping send to", msg.to);
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: from, name: "Truefit" },
      subject: msg.subject,
      content: [
        ...(msg.text ? [{ type: "text/plain", value: msg.text }] : []),
        { type: "text/html", value: msg.html },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

/** Build a digest email body from scored job matches. */
export function buildDigestHtml(
  userName: string,
  matches: { title: string; company: string; score: number; url: string }[]
): string {
  const rows = matches
    .map(
      (m) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">
            <a href="${escapeHtml(m.url)}" style="color:#2563eb;text-decoration:none;font-weight:600">${escapeHtml(m.title)}</a>
            <br><span style="color:#666;font-size:13px">${escapeHtml(m.company)}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:700;color:${m.score >= 70 ? "#16a34a" : m.score >= 40 ? "#ca8a04" : "#dc2626"}">
            ${m.score}
          </td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#2563eb;padding:24px 20px">
      <h1 style="color:#fff;margin:0;font-size:20px">Truefit — Daily Digest</h1>
    </div>
    <div style="padding:20px">
      <p style="color:#374151;margin:0 0 16px">Hi ${escapeHtml(userName)}, here are your top job matches for today:</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Job</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280">Score</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;color:#6b7280;font-size:13px">
        View all matches in your Truefit dashboard.
      </p>
    </div>
  </div>
</body>
</html>`;
}
