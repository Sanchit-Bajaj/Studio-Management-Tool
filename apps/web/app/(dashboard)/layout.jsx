import Providers from "@/components/shared/Providers";
import Nav from "@/components/shared/Nav";

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
