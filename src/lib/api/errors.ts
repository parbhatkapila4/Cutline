import { NextResponse } from "next/server";

export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  JOB_NOT_READY: "JOB_NOT_READY",
  JOB_CANNOT_CANCEL: "JOB_CANNOT_CANCEL",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  INVALID_JSON: "INVALID_JSON",
  PREVIEW_JOB_NOT_FOUND: "PREVIEW_JOB_NOT_FOUND",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  MONTHLY_LIMIT_REACHED: "MONTHLY_LIMIT_REACHED",
  VIDEO_NOT_FOUND: "VIDEO_NOT_FOUND",
  WEBHOOK_INVALID_URL: "WEBHOOK_INVALID_URL",
  QUEUE_UNAVAILABLE: "QUEUE_UNAVAILABLE",
  ANON_LIMIT_REACHED: "ANON_LIMIT_REACHED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  PLAN_REQUIRED: "PLAN_REQUIRED",
} as const;

export type ApiErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ApiErrorOptions = {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: unknown;
  headers?: Record<string, string>;
};

export function apiError(options: ApiErrorOptions): NextResponse {
  const body: {
    error: string;
    code: string;
    details?: unknown;
    tokensRemaining?: number;
    tokensRequired?: number;
    videosUsed?: number;
    videosLimit?: number;
  } = {
    error: options.message,
    code: options.code,
  };
  if (options.details != null) {
    body.details = options.details;
    const d = options.details as Record<string, unknown>;
    if (typeof d.tokensRemaining === "number") body.tokensRemaining = d.tokensRemaining;
    if (typeof d.tokensRequired === "number") body.tokensRequired = d.tokensRequired;
    if (typeof d.videosUsed === "number") body.videosUsed = d.videosUsed;
    if (typeof d.videosLimit === "number") body.videosLimit = d.videosLimit;
  }
  return NextResponse.json(body, {
    status: options.status,
    headers: options.headers,
  });
}
