import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata = { title: "Framework Studio", description: "Studio Management Tool" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{<ClerkProvider>{children}</ClerkProvider>}</body>
    </html>
  );
}
