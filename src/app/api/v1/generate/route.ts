import { handleGenerateOptions, handleGeneratePost } from "@/app/api/generate/handlers";

const V1_HEADER = { "X-API-Version": "1" };

export async function OPTIONS(request: Request) {
  const res = handleGenerateOptions(request);
  res.headers.set("X-API-Version", "1");
  return res;
}

export async function POST(request: Request) {
  const res = await handleGeneratePost(request);
  Object.entries(V1_HEADER).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
