import { handleJobOptions, handleJobGet } from "@/app/api/generate/handlers";

const V1_HEADER = { "X-API-Version": "1" };

export async function OPTIONS(request: Request) {
  const res = handleJobOptions(request);
  res.headers.set("X-API-Version", "1");
  return res;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const res = await handleJobGet(request, jobId);
  Object.entries(V1_HEADER).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
