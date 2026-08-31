import { verifyToken } from "@clerk/backend";

export async function requireClerkUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const secretKey = process.env.CLERK_SECRET_KEY;
  const jwtKey = process.env.CLERK_JWT_KEY;

  if (!token || (!secretKey && !jwtKey)) {
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
