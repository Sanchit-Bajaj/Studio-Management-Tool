import GoogleProvider from "next-auth/providers/google";
import { SignJWT } from "jose";

const apiSecret = () => new TextEncoder().encode(process.env.API_JWT_SECRET);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async session({ session, token }) {
      session.userId = token.sub;
      session.apiToken = await new SignJWT({
        sub: token.sub,
        email: session.user?.email,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1d")
        .sign(apiSecret());
      return session;
    },
  },
};
