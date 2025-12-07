"use client";

import { SessionProvider} from "next-auth/react";
import { Analytics } from "@vercel/analytics/next";

import Provider from "./Provider";
import "./globals.css";
import AuthGuard from "./AuthGuard";

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

