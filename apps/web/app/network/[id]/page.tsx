"use client";

import React, { useEffect, use } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  selectedConversationAtom,
  userRoomsAtom,
  dmConversationsAtom,
  networkLoadingAtom,
} from "@store"; 
import ChatPanel from "../components/ChatPanel";
import { ChatMapRoom, SimpleUser } from "@lib/types";

export default function NetworkChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const conversationId = unwrappedParams.id;

  const [selectedConversation, setSelectedConversation] = useAtom(selectedConversationAtom);
  const [userRooms] = useAtom(userRoomsAtom);
  const [dmConversations] = useAtom(dmConversationsAtom);
  const [loading] = useAtom(networkLoadingAtom);

  useEffect(() => {
    if (loading.profile) return;
    
    if (selectedConversation?.data.id === conversationId) return;

    let foundConvo: any = null;
    let foundType: "room" | "dm" | null = null;

    if (userRooms) {
        const room = userRooms.find((r: ChatMapRoom) => r.id === conversationId);
        if (room) {
            foundConvo = room;
            foundType = "room";
        }
    }

    if (!foundConvo && dmConversations) {
        const dm = dmConversations.find((d: SimpleUser) => d.id === conversationId);
        if (dm) {
            foundConvo = dm;
            foundType = "dm";
        }
    }

    if (foundConvo && foundType) {
      setSelectedConversation({
        type: foundType,
        data: foundConvo,
      });
    }
  }, [
    conversationId,
    userRooms,
    dmConversations,
    loading.profile,
    selectedConversation,
    setSelectedConversation,
  ]);

  return <ChatPanel />;
}
