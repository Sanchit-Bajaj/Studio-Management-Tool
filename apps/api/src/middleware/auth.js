const { createClerkClient } = require("@clerk/backend");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const STUDIO_ORG_ID = process.env.STUDIO_ORG_ID;

const PUBLIC_PATHS = new Set(["/health"]);

async function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token", code: "UNAUTHORIZED" });
  }

  try {
    const payload = await clerk.verifyToken(auth.slice(7));
    if (!payload.org_id || payload.org_id !== STUDIO_ORG_ID) {
      return res.status(403).json({ error: "Not a member of this studio", code: "FORBIDDEN" });
    }
    req.userId = payload.sub;
    req.orgId = payload.org_id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token", code: "UNAUTHORIZED" });
  }
}

module.exports = { authMiddleware };
