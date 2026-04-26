import Providers from "@/components/shared/Providers";
import Nav from "@/components/shared/Nav";

// Authenticated app surface — every page depends on the signed-in Clerk session,
// so opt out of static prerendering. Avoids `atob` failures when Next tries to
// collect page data with a placeholder publishable key at build time.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <Nav />
        <main className="flex-1 overflow-y-auto bg-[var(--sand)]">{children}</main>
      </div>
    </Providers>
  );
}
