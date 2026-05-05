import AppSessionProvider from "./session-provider";
import "./globals.css";

export const metadata = { title: "Framework Studio", description: "Studio Management Tool" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
