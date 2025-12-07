"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      // 1. Clear Local Storage
      localStorage.clear();

      // 2. Clear IndexedDB / Dexie
      // This grabs all existing DB names and deletes them
      if (window.indexedDB && window.indexedDB.databases) {
        const dbs = await window.indexedDB.databases();
        dbs.forEach((db) => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      }
    } catch (error) {
      console.error("Error clearing local data:", error);
    } finally {
      // 3. Sign out via NextAuth
      // This is in finally to ensure logout happens even if DB clearing fails
      await signOut({ callbackUrl: "/login" });
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed top-4 right-4 z-50 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors cursor-pointer border border-zinc-800"
      title="Logout and Clear Data"
    >
      <LogOut size={20} />
    </button>
  );
}
