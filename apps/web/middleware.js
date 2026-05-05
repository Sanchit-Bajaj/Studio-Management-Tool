export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/auth|sign-in).*)"],
};
