import { Resend } from "resend";
import { config } from "../config.js";

const resend = config.email.apiKey ? new Resend(config.email.apiKey) : null;

export async function sendPasswordResetEmail(to, resetUrl) {
  const subject = "Reimposta la tua password NutrIA";
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h2 style="color:#10b981">NutrIA</h2>
      <p>Hai richiesto di reimpostare la password. Clicca il pulsante qui sotto. Il link scade tra 1 ora.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Reimposta password</a>
      </p>
      <p style="color:#64748b;font-size:13px">Se non hai richiesto tu il reset, ignora questa email.</p>
      <p style="color:#94a3b8;font-size:12px;word-break:break-all">${resetUrl}</p>
    </div>`;

  if (!resend) {
    // Dev fallback: no provider configured. Log the link so flows are testable.
    console.log(`[email] (dev) Password reset for ${to}: ${resetUrl}`);
    return { delivered: false, devLink: resetUrl };
  }

  await resend.emails.send({ from: config.email.from, to, subject, html });
  return { delivered: true };
}
