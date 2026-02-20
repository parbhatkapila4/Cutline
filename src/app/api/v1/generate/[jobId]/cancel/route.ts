import { handleCancelOptions, handleCancelPost } from "@/app/api/generate/handlers";

const V1_HEADER = { "X-API-Version": "1" };
export async function OPTIONS(request: Request) {
  const res = handleCancelOptions(request);
  res.headers.set("X-API-Version", "1");
  return res;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const res = await handleCancelPost(request, jobId);
  Object.entries(V1_HEADER).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
