export type ContactSubmissionInput = {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  inquiry: string;
  budget: string;
  details: string;
};

export type ContactEmailStatus = "pending" | "sent" | "failed";

export type ContactSubmission = ContactSubmissionInput & {
  id: string;
  email_status: ContactEmailStatus;
  created_at: string;
};

export type ContactValidationResult =
  | { ok: true; value: ContactSubmissionInput }
  | { ok: false; errors: string[] };

export type ContactDeliveryResult = {
  stored: boolean;
  emailed: boolean;
  submissionId: string | null;
};
