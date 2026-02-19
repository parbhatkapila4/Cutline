import { handleCancelOptions, handleCancelPost } from "../../handlers";
export async function OPTIONS(request: Request) {
  return handleCancelOptions(request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return handleCancelPost(request, jobId);
}
