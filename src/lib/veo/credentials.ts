import fs from "fs";
import os from "os";
import path from "path";

export type VertexCredentialMode = "service-account-b64" | "ambient-adc";

export interface VertexCredentialInfo {
  mode: VertexCredentialMode;
  credentialsPath?: string;
  clientEmail?: string;
  keyFileProject?: string;
}

interface ServiceAccountFile {
  type?: string;
  client_email?: string;
  project_id?: string;
}

let cached: VertexCredentialInfo | null = null;

function readIdentity(filePath: string): { clientEmail?: string; keyFileProject?: string } {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as ServiceAccountFile;
    return {
      ...(parsed.client_email ? { clientEmail: parsed.client_email } : {}),
      ...(parsed.project_id ? { keyFileProject: parsed.project_id } : {}),
    };
  } catch {
    return {};
  }
}

export function ensureVertexCredentials(): VertexCredentialInfo {
  if (cached) return cached;

  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;

  if (!encoded || encoded.trim() === "") {
    const ambientPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const identity =
      ambientPath && fs.existsSync(ambientPath) ? readIdentity(ambientPath) : {};
    cached = {
      mode: "ambient-adc",
      ...(ambientPath ? { credentialsPath: ambientPath } : {}),
      ...identity,
    };
    console.log(
      "[veo] credentials: ambient ADC" +
      (ambientPath ? ` (GOOGLE_APPLICATION_CREDENTIALS=${ambientPath})` : " (no GOOGLE_APPLICATION_CREDENTIALS; relying on gcloud/metadata discovery)") +
      (cached.clientEmail ? `, identity=${cached.clientEmail}` : "")
    );
    return cached;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(encoded.trim(), "base64").toString("utf8");
  } catch (err) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_B64 is not valid base64: " +
      (err instanceof Error ? err.message : String(err))
    );
  }

  let parsed: ServiceAccountFile;
  try {
    parsed = JSON.parse(decoded) as ServiceAccountFile;
  } catch (err) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_B64 did not decode to valid JSON: " +
      (err instanceof Error ? err.message : String(err)) +
      ". Encode the whole service-account key file, e.g. base64 -w0 key.json."
    );
  }

  if (!parsed.client_email) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_B64 decoded to JSON with no client_email - that is not a service-account key file."
    );
  }

  const credentialsPath = path.join(os.tmpdir(), `cutline-vertex-sa-${process.pid}.json`);

  try {
    fs.rmSync(credentialsPath, { force: true });
  } catch {
  }
  fs.writeFileSync(credentialsPath, decoded, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(credentialsPath, 0o600);
  } catch {
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

  cached = {
    mode: "service-account-b64",
    credentialsPath,
    clientEmail: parsed.client_email,
    ...(parsed.project_id ? { keyFileProject: parsed.project_id } : {}),
  };

  console.log(
    `[veo] credentials: decoded GOOGLE_SERVICE_ACCOUNT_JSON_B64 to ${credentialsPath} (mode 0600), ` +
    `identity=${parsed.client_email}` +
    (parsed.project_id ? `, key file project=${parsed.project_id}` : "")
  );

  return cached;
}
