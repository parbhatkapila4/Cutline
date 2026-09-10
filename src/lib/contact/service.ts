import { getSql, isDatabaseConfigured } from "@/lib/db/client";
import type { ContactEmailStatus, ContactSubmissionInput } from "./types";

export async function storeContactSubmission(
  input: ContactSubmissionInput,
  clientIdentifier: string | null
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  const sql = getSql();
  const rows = (await sql`
    INSERT INTO contact_submissions (
      name, email, phone, company, inquiry, budget, details, client_identifier
    )
    VALUES (
      ${input.name},
      ${input.email},
      ${input.phone},
      ${input.company},
      ${input.inquiry},
      ${input.budget},
      ${input.details},
      ${clientIdentifier}
    )
    RETURNING id
  `) as { id: string }[];

  return rows[0]?.id ?? null;
}

export async function markContactEmailStatus(
  submissionId: string,
  status: ContactEmailStatus,
  detail: { messageId?: string | null; error?: string | null } = {}
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const sql = getSql();
  await sql`
    UPDATE contact_submissions
    SET email_status = ${status},
        provider_message_id = ${detail.messageId ?? null},
        email_error = ${detail.error ?? null}
    WHERE id = ${submissionId}::uuid
  `;
}
