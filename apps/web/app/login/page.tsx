"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { userAtom } from "@store";
import { API_BASE_URL } from "@/lib/constants";
import { User } from "@/lib/types";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [, setUser] = useAtom(userAtom);

  const isSyncing = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || isSyncing.current) return;

    const currentUser = session.user;
    isSyncing.current = true;

    const syncUser = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentUser.name,
            email: currentUser.email,
            image: currentUser.image,
          }),
        });

        if (!res.ok) throw new Error("Backend error");

        const userData: User = await res.json();
        setUser(userData);

        router.replace("/home");
      } catch (err) {
        console.error("error logging in :", err);
        isSyncing.current = false;
      }
    };

    syncUser();
  }, [session, status, router, setUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      {!session?.user ? (
        <button
          onClick={() => signIn("google")}
          className="flex items-center bg-white text-black cursor-pointer px-6 py-3 rounded-md shadow-md hover:shadow-lg transition-shadow"
        >
          <svg
            className="w-5 h-5 mr-3"
            viewBox="0 0 533.5 544.3"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M533.5 278.4c0-17.4-1.5-34-4.3-50.3H272v95.1h147.3c-6.3 33.7-25.6 62.3-54.8 81.5v67.8h88.5c51.9-47.8 81.5-118.1 81.5-194.1z"
              fill="#4285F4"
            />
            <path
              d="M272 544.3c73.6 0 135.3-24.4 180.4-66.4l-88.5-67.8c-24.6 16.5-56.2 26.3-91.9 26.3-70.8 0-130.8-47.8-152.3-112.1H28.9v70.5C74.1 481.1 166.8 544.3 272 544.3z"
              fill="#34A853"
            />
            <path
              d="M119.8 322.8c-4.9-14.3-7.7-29.5-7.7-45s2.8-30.7 7.7-45v-70.5H28.9c-17.5 35.1-28.9 74.3-28.9 115s11.4 79.9 28.9 115l90.9-70.5z"
              fill="#FBBC05"
            />
            <path
              d="M272 107.6c39.9 0 75.7 13.8 103.9 40.8l77.9-77.9C406.8 24.4 345.1 0 272 0 166.8 0 74.1 63.2 28.9 159.4l90.9 70.5c21.5-64.3 81.5-112.3 152.2-112.3z"
              fill="#EA4335"
            />
          </svg>
          <span className="font-medium">Sign in with Google</span>
        </button>
      ) : (
        <span className="loading loading-infinity loading-xl text-white"></span>
      )}
    </div>
  );
}
