"use client";

import { useSetAtom } from "jotai";
import { selectedConversationAtom } from "@store"; 
import NetworkSidebar from "./components/NetworkSidebar";

import { MessageSquare } from "lucide-react";
import { useEffect } from "react";

export default function NetworkPage() {
  const setSelectedConversation = useSetAtom(selectedConversationAtom);

  useEffect(() => {
    setSelectedConversation(null);
  }, [setSelectedConversation]);

  return (
    <div className="h-full w-full flex bg-black">
      <div className="flex md:hidden w-full h-full">
        <NetworkSidebar />
      </div>

      <div className="hidden md:flex w-full h-full items-center justify-center bg-black text-zinc-500 border-l border-zinc-800">
        <div className="flex flex-col items-center">
          <MessageSquare size={80} className="mb-4 text-zinc-700" />
          <p className="text-lg font-medium text-zinc-400">Select a chat to start messaging</p>
        </div>
      </div>
    </div>
  );
}
