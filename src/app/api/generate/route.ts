import { handleGenerateOptions, handleGeneratePost } from "./handlers";

export async function OPTIONS(request: Request) {
  return handleGenerateOptions(request);
}

export async function POST(request: Request) {
  return handleGeneratePost(request);
}
