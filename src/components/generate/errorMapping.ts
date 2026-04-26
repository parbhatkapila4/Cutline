export function getSubmitErrorMessage(status: number): string {
  if (status === 400) return "Please check your input.";
  if (status === 429) return "Too many requests. Please try again in a moment.";
  if (status >= 500) return "Something went wrong. Please try again.";
  return "Something went wrong. Please try again.";
}
