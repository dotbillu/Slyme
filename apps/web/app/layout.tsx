"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

import Provider from "./Provider";
import Navbar from "@shared/Navbar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black h-100 w-full overscroll-none">
        <Provider>
          <SessionProvider>
            <AuthGuard>{children}</AuthGuard>
            <Analytics />
          </SessionProvider>
        </Provider>
      </body>
    </html>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (status === "unauthenticated" && path !== "/login") {
      router.replace("/login");
    }
  }, [status, path, router]);

  if (path?.startsWith("/api/auth")) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 h-100 w-full">
        <span className="loading loading-dots loading-xl text-white"></span>
      </div>
    );
  }

  if (path === "/login") {
    return (
      <div className="bg-black h-dvh w-full flex flex-col overflow-y-auto">
        {children}
      </div>
    );
  }

  if (session) {
    return (
      <div className="bg-black relative h-dvh w-full overflow-hidden">
        <div className="h-full w-full overflow-y-auto pb-24">{children}</div>
        <div className="fixed bottom-0 left-0 right-0 w-full z-50">
          <Navbar />
        </div>
      </div>
    );
  }

  return null;
}
