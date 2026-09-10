import { Resend } from "resend";
import type { ContactSubmissionInput } from "./types";

const DEFAULT_TO = "parbhat@parbhat.work";

export type ContactEmailResult =
  | { sent: true; messageId: string | null }
  | { sent: false; reason: string };

export function getContactRecipient(): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || DEFAULT_TO;
}

export function getContactSender(): string | null {
  return process.env.CONTACT_FROM_EMAIL?.trim() || null;
}

export function isContactEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) && Boolean(getContactSender());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string | null): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:8px 16px 8px 0;vertical-align:top;color:#71717a;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;vertical-align:top;color:#18181b;font-size:14px;">${escapeHtml(value).replace(/\n/g, "<br />")}</td>
  </tr>`;
}

function buildHtml(input: ContactSubmissionInput, submissionId: string | null): string {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;">
  <h2 style="margin:0 0 4px;font-size:18px;color:#18181b;">New contact form submission</h2>
  <p style="margin:0 0 20px;font-size:13px;color:#71717a;">Sent from the Cutline /contact page.</p>
  <table style="border-collapse:collapse;width:100%;">
    ${row("Name", input.name)}
    ${row("Email", input.email)}
    ${row("Phone", input.phone)}
    ${row("Company", input.company)}
    ${row("Inquiry", input.inquiry)}
    ${row("Budget", input.budget)}
    ${row("Details", input.details)}
  </table>
  ${submissionId ? `<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">Submission ID: ${escapeHtml(submissionId)}</p>` : ""}
</div>`;
}

function buildText(input: ContactSubmissionInput, submissionId: string | null): string {
  const lines = [
    "New contact form submission (Cutline /contact)",
    "",
    `Name:    ${input.name}`,
    `Email:   ${input.email}`,
    `Phone:   ${input.phone ?? "-"}`,
    `Company: ${input.company ?? "-"}`,
    `Inquiry: ${input.inquiry}`,
    `Budget:  ${input.budget}`,
    "",
    "Details:",
    input.details,
  ];
  if (submissionId) {
    lines.push("", `Submission ID: ${submissionId}`);
  }
  return lines.join("\n");
}

export async function sendContactEmail(
  input: ContactSubmissionInput,
  submissionId: string | null
): Promise<ContactEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not set" };
  }
  const from = getContactSender();
  if (!from) {
    return { sent: false, reason: "CONTACT_FROM_EMAIL is not set" };
  }

  const subjectName = input.name.replace(/\s+/g, " ").trim();

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [getContactRecipient()],
      replyTo: input.email,
      subject: `New enquiry from ${subjectName} - ${input.inquiry} (${input.budget})`,
      html: buildHtml(input, submissionId),
      text: buildText(input, submissionId),
    });

    if (error) {
      return { sent: false, reason: error.message || "Resend rejected the message" };
    }
    return { sent: true, messageId: data?.id ?? null };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : "Unknown email transport error";
    return { sent: false, reason };
  }
}
