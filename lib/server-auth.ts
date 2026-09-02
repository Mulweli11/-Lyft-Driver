import { verifyToken } from "@clerk/backend";

export async function requireClerkUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secretKey = process.env.CLERK_SECRET_KEY;
  const jwtKey = process.env.CLERK_JWT_KEY;
  const isLocalDevWithoutServerSecret =
    process.env.NODE_ENV !== "production" && !secretKey && !jwtKey;

  if (!token) {
    if (isLocalDevWithoutServerSecret) {
      return "local-dev-user";
    }

    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!secretKey && !jwtKey) {
    if (isLocalDevWithoutServerSecret) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1] ?? "", "base64").toString("utf8"),
        ) as { sub?: string };

        if (payload.sub) {
          return payload.sub;
        }
      } catch {
        // Fall through to the safe local stub below so local development still works
        // without server-side Clerk secret configuration.
      }

      return "local-dev-user";
    }

    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const claims = await verifyToken(token, {
      ...(secretKey ? { secretKey } : {}),
      ...(jwtKey ? { jwtKey } : {}),
    });

    if (!claims.sub) {
      throw new Error("Authenticated token has no subject");
    }

    return claims.sub;
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid authentication token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
