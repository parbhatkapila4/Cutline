import { handleJobOptions, handleJobGet } from "../handlers";

export async function OPTIONS(request: Request) {
  return handleJobOptions(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return handleJobGet(request, jobId);
}
