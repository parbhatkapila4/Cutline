import { handleDownloadOptions, handleDownloadGet } from "../../handlers";
export async function OPTIONS(request: Request) {
  return handleDownloadOptions(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return handleDownloadGet(request, jobId);
}
