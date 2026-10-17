"use client";
import { AppData } from "@/lib/types";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useStore, useUser } from "@/lib/store";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const user = useUser();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
    if (path !== "/login" && !useStore.getState().sessionUser) {
      // allow brief hydration then redirect
      const t = setTimeout(() => {
        if (!useStore.getState().sessionUser) router.push("/login");
      }, 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (path === "/login") return <>{children}</>;
  if (!ready) return <Splash />;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[264px]">
        <Topbar />
        <main className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 text-white">
      <div className="animate-pulse text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-aqua-400 to-gold-400" />
        <p className="text-sm font-semibold tracking-widest text-white/70">MAXHALS FORENSICS SUITE</p>
      </div>
    </div>
  );
}

// re-export for convenience
export type { AppData };
