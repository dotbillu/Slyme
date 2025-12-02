"use client";

import { House, Map, Network, User, Search } from "lucide-react";
import {
  CurrentPageAtom,
  PageName,
  userAtom,
  totalUnseenConversationsAtom,
} from "@store";
import { useAtom } from "jotai";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/constants";
import { UserProfile } from "@types";

const fetchProfile = async (username: string): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE_URL}/user/profile/${username}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const stkwidth = 1.5;
  const stksize = 20;

  const [currentPage, setCurrentPage] = useAtom(CurrentPageAtom);
  const [loggedInUser] = useAtom(userAtom);
  const [unseenCount] = useAtom(totalUnseenConversationsAtom);
  const prevUnseenCountRef = useRef(unseenCount);

  const icons = [
    { name: "Home", Icon: House },
    { name: "Map", Icon: Map },
    { name: "Search", Icon: Search },
    { name: "Network", Icon: Network },
    { name: "profile", Icon: User },
  ] as const;
  useEffect(() => {
    if (unseenCount > prevUnseenCountRef.current && unseenCount > 0) {
      const audio = new Audio("/notification.mp3"); 
      audio.volume = 0.5;
      audio.play().catch((err) => console.log("Audio interaction needed:", err));
    }
    prevUnseenCountRef.current = unseenCount;
  }, [unseenCount]);

  useEffect(() => {
    if (!loggedInUser?.username) return;

    router.prefetch(`/profile/${loggedInUser.username}`);

    queryClient.prefetchQuery({
      queryKey: ["profile", loggedInUser.username],
      queryFn: () => fetchProfile(loggedInUser.username),
      staleTime: 60_000,
    });

    fetch(`${API_BASE_URL}/user/profile/${loggedInUser.username}`).catch(
      () => {},
    );
  }, [loggedInUser, queryClient, router]);

  useEffect(() => {
    const currentPath = (pathname.split("/")[1] || "home").toLowerCase();

    switch (currentPath) {
      case "":
      case "home":
        setCurrentPage("Home");
        break;
      case "map":
        setCurrentPage("Map");
        break;
      case "search":
        setCurrentPage("Search");
        break;
      case "network":
        setCurrentPage("Network");
        break;
      case "profile":
        setCurrentPage("profile");
        break;
      default:
        setCurrentPage("Home");
    }
  }, [pathname, setCurrentPage]);

  function HandleOnClick(pagename: PageName) {
    setCurrentPage(pagename);

    if (pagename === "profile") {
      if (loggedInUser?.username) {
        router.push(`/profile/${loggedInUser.username}`);
      } else {
        router.push("/profile");
      }
      return;
    }

    if (pagename === "Home") {
      router.push("/home");
      return;
    }

    router.push(`/${pagename.toLowerCase()}`);
  }

  return (
    <div className="w-full bg-black">
      <div className="flex justify-around items-center max-w-lg mx-auto h-16 px-2">
        {icons.map(({ name, Icon }) => (
          <div
            key={name}
            onClick={() => HandleOnClick(name)}
            className={`cursor-pointer rounded-xl p-3 transition-colors relative ${
              currentPage === name
                ? "bg-white text-black"
                : "text-white hover:bg-zinc-800"
            }`}
          >
            {name === "Network" && unseenCount > 0 && (
              <div className="absolute top-2 right-2 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-black">
                {unseenCount > 9 ? "9+" : unseenCount}
              </div>
            )}
            
            <Icon size={stksize} strokeWidth={stkwidth} />
          </div>
        ))}
      </div>
    </div>
  );
}
