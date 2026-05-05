const { jwtVerify } = require("jose");

const apiSecret = () => new TextEncoder().encode(process.env.API_JWT_SECRET);

const PUBLIC_PATHS = new Set(["/health"]);

async function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token", code: "UNAUTHORIZED" });
  }

  try {
    const { payload } = await jwtVerify(auth.slice(7), apiSecret());
    req.userId = payload.sub;
    next();
  } catch (err) {
    console.error("[auth] jwtVerify failed:", err?.message);
    res.status(401).json({ error: "Invalid or expired token", code: "UNAUTHORIZED" });
  }
}

module.exports = { authMiddleware };
