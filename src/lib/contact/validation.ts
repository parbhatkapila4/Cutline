import { BUDGET_OPTIONS, INQUIRY_OPTIONS } from "./options";
import type { ContactSubmissionInput, ContactValidationResult } from "./types";

export const limits = {
  name: 120,
  email: 254,
  phone: 40,
  company: 160,
  details: 5000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(body: Record<string, unknown>, key: string): string {
  const raw = body[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function optional(value: string): string | null {
  return value.length > 0 ? value : null;
}

export function validateContactSubmission(
  body: Record<string, unknown>
): ContactValidationResult {
  const errors: string[] = [];

  const name = readField(body, "name");
  const email = readField(body, "email");
  const phone = readField(body, "phone");
  const company = readField(body, "company");
  const inquiry = readField(body, "inquiry");
  const budget = readField(body, "budget");
  const details = readField(body, "details");

  if (!name) errors.push("Full name is required.");
  else if (name.length > limits.name) errors.push("Full name is too long.");

  if (!email) errors.push("Email is required.");
  else if (!EMAIL_RE.test(email)) errors.push("Email is not valid.");
  else if (email.length > limits.email) errors.push("Email is too long.");

  if (phone.length > limits.phone) errors.push("Phone number is too long.");
  if (company.length > limits.company) errors.push("Company name is too long.");

  if (!inquiry) errors.push("Inquiry reason is required.");
  else if (!(INQUIRY_OPTIONS as readonly string[]).includes(inquiry)) {
    errors.push("Inquiry reason is not a recognized option.");
  }

  if (!budget) errors.push("Project budget is required.");
  else if (!(BUDGET_OPTIONS as readonly string[]).includes(budget)) {
    errors.push("Project budget is not a recognized option.");
  }

  if (!details) errors.push("Project details are required.");
  else if (details.length > limits.details) errors.push("Project details are too long.");

  if (errors.length > 0) return { ok: false, errors };

  const value: ContactSubmissionInput = {
    name,
    email,
    phone: optional(phone),
    company: optional(company),
    inquiry,
    budget,
    details,
  };
  return { ok: true, value };
}
