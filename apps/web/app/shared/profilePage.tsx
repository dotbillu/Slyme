"use client";

import { Activity, LogOut, SunMoon, User as UserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai"; 
import { userAtom } from "@store"; 

export default function ProfilePageWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return <ProfilePage />;
}

function ProfilePage() {
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Close sidebar/modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#profile-sidebar") &&
        !target.closest("#profile-button") &&
        !target.closest("#logout-modal")
      ) {
        setShowProfile(false);
        setShowLogoutModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      {/* User button */}
      <UserIcon
        id="profile-button"
        className="fixed right-2 m-3 mt-5 z-50 border border-zinc-700 cursor-pointer rounded-2xl bg-black"
        color="white"
        strokeWidth={0.7}
        size={25}
        onClick={() => setShowProfile(!showProfile)}
      />

      <AnimatePresence>
        {/* Sidebar */}
        {showProfile && !showLogoutModal && (
          <SideBarContent onLogout={() => setShowLogoutModal(true)} />
        )}

        {/* Logout confirmation modal */}
        {showLogoutModal && (
          <LogoutModal
            onConfirm={() => signOut({ callbackUrl: "/login" })}
            onCancel={() => setShowLogoutModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ src }: { src?: string | null }) {
  if (!src) return <UserIcon size={32} color="white" />;
  return (
    <Image
      src={src}
      alt="avatar"
      width={32}
      height={32}
      className="rounded-full border border-zinc-700"
    />
  );
}

function SideBarContent({ onLogout }: { onLogout: () => void }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loggedInUser] = useAtom(userAtom); // 3. Get logged-in user from Jotai

  if (status === "loading") return null;

  const userName = session?.user?.name || "Guest";
  const userImage = session?.user?.image ?? null;

  const menuItems = [
    {
      label: "Profile",
      icon: UserIcon,
      // 4. FIX: Use the username from the Jotai atom
      action: () => {
        if (loggedInUser?.username) {
          router.push(`/profile/${loggedInUser.username}`);
        } else {
          // Fallback, though this shouldn't be hit if user is logged in
          console.error("No username found in userAtom");
        }
      },
      description: "View your profile",
    },
    {
      label: "My Activities",
      icon: SunMoon,
      action: () => alert("Go to My Activities"),
      description: "View your activities",
    },
    {
      label: "Change Theme",
      icon: Activity,
      action: () => alert("Theme toggled!"),
      description: "Switch between dark/light mode",
    },
    {
      label: "Logout",
      icon: LogOut,
      action: onLogout,
      description: "Sign out from your account",
    },
  ];

  return (
    <motion.div
      id="profile-sidebar"
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-max bg-black text-white border border-zinc-700 shadow-lg rounded-2xl p-6 z-50"
    >
      {/* User header */}
      <div className="mb-4 flex items-center gap-3 border-b border-zinc-700 pb-3">
        <Avatar src={userImage} />
        <p className="font-bold">{userName}</p>
      </div>

      {/* Menu buttons */}
      <div className="flex flex-col gap-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative group">
              <button
                onClick={item.action}
                className="flex items-center gap-2 p-3 hover:bg-zinc-800 rounded-2xl cursor-pointer w-full border-transparent transition-colors"
              >
                <Icon size={20} color="white" />
                {item.label}
              </button>
              {/* Hover description */}
              <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {item.description}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function LogoutModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      id="logout-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black p-6 rounded-2xl shadow-lg w-80 text-center border border-zinc-700"
      >
        <p className="mb-4 font-semibold text-lg text-white">
          Are you sure you want to logout?
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded cursor-pointer"
          >
            Yes
          </button>
          <button
            onClick={onCancel}
            className="bg-zinc-600 hover:bg-zinc-700 text-white px-4 py-2 rounded cursor-pointer"
          >
            No
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
