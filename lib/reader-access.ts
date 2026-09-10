const encoder = new TextEncoder();

export const READER_ACCESS_COOKIE =
  "reader_access";

export const READER_PASSWORD_COOKIE =
  "reader_password_verified";

/*
 * Reader access berlaku 12 jam.
 */
export const READER_ACCESS_MAX_AGE =
  60 * 60 * 12;

/*
 * Cookie antara password -> OTP
 * hanya berlaku 10 menit.
 */
export const READER_PASSWORD_MAX_AGE =
  60 * 10;

export type ReaderAccessPayload = {
  userId: string;
  email: string;
  sessionId: string;
  exp: number;
};

/* =========================================================
 * SECRET
 * ========================================================= */

function getSecret() {
  const secret =
    process.env.READER_ACCESS_SECRET;

  if (!secret) {
    throw new Error(
      "READER_ACCESS_SECRET belum dikonfigurasi."
    );
  }

  return secret;
}

/* =========================================================
 * BASE64 URL
 * ========================================================= */

function bytesToBase64Url(
  bytes: Uint8Array
) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function stringToBase64Url(
  value: string
) {
  return bytesToBase64Url(
    encoder.encode(value)
  );
}

function base64UrlToString(
  value: string
) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    normalized.length % 4 === 0
      ? ""
      : "=".repeat(
          4 - (normalized.length % 4)
        );

  const binary = atob(
    normalized + padding
  );

  const bytes = Uint8Array.from(
    binary,
    (char) => char.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

/* =========================================================
 * HMAC TOKEN
 * ========================================================= */

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
}

async function sign(
  value: string
) {
  const key = await getHmacKey();

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(value)
    );

  return bytesToBase64Url(
    new Uint8Array(signature)
  );
}

async function verifySignature(
  value: string,
  signature: string
) {
  try {
    const normalized = signature
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(
            4 -
              (normalized.length % 4)
          );

    const binary = atob(
      normalized + padding
    );

    const signatureBytes =
      Uint8Array.from(
        binary,
        (char) =>
          char.charCodeAt(0)
      );

    const key = await getHmacKey();

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(value)
    );
  } catch {
    return false;
  }
}

/* =========================================================
 * SESSION HASH
 *
 * sessionId mentah hanya ada di cookie HMAC.
 * Database menyimpan SHA-256 hash-nya saja.
 * ========================================================= */

export async function hashReaderSessionId(
  sessionId: string
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(sessionId)
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

/* =========================================================
 * CREATE READER ACCESS TOKEN
 * ========================================================= */

export async function
createReaderAccessToken(params: {
  userId: string;
  email: string;
  sessionId: string;
}) {
  const now = Math.floor(
    Date.now() / 1000
  );

  const payload: ReaderAccessPayload = {
    userId: params.userId,
    email: params.email,
    sessionId: params.sessionId,
    exp:
      now +
      READER_ACCESS_MAX_AGE,
  };

  const encodedPayload =
    stringToBase64Url(
      JSON.stringify(payload)
    );

  const signature =
    await sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

/* =========================================================
 * VERIFY READER ACCESS TOKEN
 * ========================================================= */

export async function
verifyReaderAccessToken(
  token?: string | null
): Promise<ReaderAccessPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const [
      encodedPayload,
      signature,
      extra,
    ] = token.split(".");

    if (
      !encodedPayload ||
      !signature ||
      extra
    ) {
      return null;
    }

    const valid =
      await verifySignature(
        encodedPayload,
        signature
      );

    if (!valid) {
      return null;
    }

    const payload =
      JSON.parse(
        base64UrlToString(
          encodedPayload
        )
      ) as ReaderAccessPayload;

    if (
      !payload.userId ||
      !payload.email ||
      !payload.sessionId ||
      !payload.exp
    ) {
      return null;
    }

    const now = Math.floor(
      Date.now() / 1000
    );

    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/* =========================================================
 * COOKIE CONFIG
 * ========================================================= */

export function
getReaderAccessCookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge:
      READER_ACCESS_MAX_AGE,
  };
}

export function
getReaderPasswordCookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge:
      READER_PASSWORD_MAX_AGE,
  };
}
