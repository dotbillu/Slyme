
import {  useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { userAtom } from "@store";
import { API_BASE_URL } from "@/lib/constants";
import { User } from "@/lib/types";
import Navbar from "@shared/Navbar";
import "./globals.css";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useAtom(userAtom);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (user) return;
    if (isSyncing.current) return;

    const syncUser = async () => {
      isSyncing.current = true;
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/signin/oauth/${session.user.email}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!res.ok) {
          isSyncing.current = false;
          return;
        }

        const userData: User = await res.json();
        setUser(userData);
      } catch (err) {
        console.error("Sync user error", err);
        isSyncing.current = false;
      }
    };

    syncUser();
  }, [session, status, setUser, user]);

  useEffect(() => {

    if (status === "unauthenticated") {
      router.replace(`/auth`);
    }

    if (status === "authenticated" && session?.user?.isNewUser) {
      if (path !== "/welcome/newuser") {
        router.replace("/welcome/newuser");
      }
    }
  }, [status, path, router, session]);

  if (path?.startsWith("/api/auth")) {
    return <>{children}</>;
  }

  const isLoading =
    status === "loading" ||
    (status === "authenticated" &&
      !path?.startsWith("/auth") &&
      !path?.startsWith("/welcome") &&
      !user);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 h-screen">
        <span className="loading loading-dots loading-xl text-white"></span>
      </div>
    );
  }

  if (path?.startsWith("/auth")) {
    return (
      <div className="bg-black h-dvh w-full flex flex-col overflow-y-auto">
        {children}
      </div>
    );
  }

  if (path?.startsWith("/welcome")) {
    return <div className="h-dvh w-full bg-black">{children}</div>;
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
