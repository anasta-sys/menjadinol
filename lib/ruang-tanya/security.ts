import { z } from "zod";

export const ruangTanyaSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  pageUrl: z.string().max(2048).optional(),
  conversationId: z.string().uuid().optional(),
  action: z.enum(["send", "edit", "retry"]).default("send"),
  userMessageId: z.string().uuid().optional(),
  assistantMessageId: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  if (data.action === "edit" && !data.userMessageId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["userMessageId"],
      message: "userMessageId wajib untuk edit.",
    });
  }

  if (data.action === "retry" && !data.assistantMessageId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["assistantMessageId"],
      message: "assistantMessageId wajib untuk retry.",
    });
  }

  if (
    (data.action === "edit" || data.action === "retry") &&
    !data.conversationId
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["conversationId"],
      message: "conversationId wajib untuk edit atau retry.",
    });
  }
});

export function safeRuangTanyaText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 2000);
}

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function ruangTanyaClientKey(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();

  return ip || headers.get("x-real-ip") || "unknown";
}

export function ruangTanyaRateLimit(key: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 20;

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

export function isAllowedRuangTanyaOrigin(
  request: Request
) {
  const origin = request.headers.get("origin");

  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);

    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}