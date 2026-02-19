import { handleJobsOptions, handleJobsGet } from "../handlers";

export async function OPTIONS(request: Request) {
  return handleJobsOptions(request);
}

export async function GET(request: Request) {
  return handleJobsGet(request);
}
