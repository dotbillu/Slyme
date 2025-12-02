"use client";

import React, { useEffect } from "react";
import { useAtom, useSetAtom, atom } from "jotai";
import { io, Socket } from "socket.io-client";
import { Loader2 } from "lucide-react";
import { API_BASE_URL, WS_BASE_URL } from "@/lib/constants";
import { ChatUserProfile, SimpleUser, MessageType, Reaction } from "@/lib/types";
import NetworkSidebar from "./components/NetworkSidebar";
import { db } from "@lib/db"; // Ensure this path is correct for your project

import {
  userAtom,
  userRoomsAtom,
  dmConversationsAtom,
  followingListAtom,
  networkLoadingAtom,
  networkErrorAtom,
  messagesAtom,
  selectedConversationAtom,
  socketAtom,
} from "@store";


export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser] = useAtom(userAtom);
  const [userRooms, setUserRooms] = useAtom(userRoomsAtom);
  const [dmConversations, setDmConversations] = useAtom(dmConversationsAtom);
  const setFollowingList = useSetAtom(followingListAtom);
  const [isLoading] = useAtom(networkLoadingAtom);
  const setError = useSetAtom(networkErrorAtom);
  const setLoading = useSetAtom(networkLoadingAtom);

  const [socket, setSocket] = useAtom(socketAtom);
  const setMessages = useSetAtom(messagesAtom);
  const [selectedConversation] = useAtom(selectedConversationAtom);

  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io(WS_BASE_URL);
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [currentUser, setSocket]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.emit("authenticate", currentUser.id);

    const handleDmConfirm = async ({ tempId, message }: { tempId: string; message: MessageType }) => {
      setMessages((prev) => prev.map((msg) => (msg.id === tempId ? message : msg)));
      
      if ('recipientId' in message) {
          const otherUserId = message.recipientId;
          
          setDmConversations((prev) => 
            prev.map((convo) => {
                if (convo.id === otherUserId) {
                    return {
                        ...convo,
                        lastMessage: message.content,
                        lastMessageTimestamp: message.createdAt,
                    };
                }
                return convo;
            })
          );

          try {
            await db.messages.put(message);
            const conversation = dmConversations.find(c => c.id === otherUserId);
            if (conversation) {
               await db.dms.put({
                 ...conversation,
                 lastMessage: message.content,
                 lastMessageTimestamp: message.createdAt
               });
            }
          } catch (e) { console.error("DB Sync Error", e); }
      }
    };

    const handleDmReceive = async (message: MessageType) => {
      const isSelected =
        selectedConversation?.type === "dm" &&
        selectedConversation.data.id === message.senderId;

      if (isSelected) {
        setMessages((prev) => [...prev, message]);
      }

      let newUnseenCount = 0;

      setDmConversations((prev) =>
        prev.map((convo) => {
          if (convo.id === message.senderId) {
            newUnseenCount = isSelected ? 0 : (convo.unseenCount || 0) + 1;
            return {
              ...convo,
              lastMessage: message.content,
              lastMessageTimestamp: message.createdAt,
              unseenCount: newUnseenCount,
            };
          }
          return convo;
        })
      );

      try {
        await db.messages.put(message);
        const conversation = dmConversations.find(c => c.id === message.senderId);
        if (conversation) {
           await db.dms.put({
             ...conversation,
             lastMessage: message.content,
             lastMessageTimestamp: message.createdAt,
             unseenCount: newUnseenCount
           })
        }
      } catch (e) { console.error("DB Sync Error", e); }
    };

    const handleGroupReceive = async ({ tempId, message }: { tempId: string; message: MessageType }) => {
      const isSelected =
        selectedConversation?.type === "room" &&
        selectedConversation.data.id === message.roomId;

      if (message.senderId === currentUser.id) {
        setMessages((prev) => prev.map((msg) => (msg.id === tempId ? message : msg)));
      } else if (isSelected) {
        setMessages((prev) => [...prev, message]);
      }

      let newUnseenCount = 0;

      setUserRooms((prev) =>
        prev.map((room) => {
          if (room.id === message.roomId) {
            const shouldIncrement = message.senderId !== currentUser.id && !isSelected;
            newUnseenCount = shouldIncrement ? (room.unseenCount || 0) + 1 : (room.unseenCount || 0);
            
            return {
              ...room,
              lastMessage: message.content,
              lastMessageTimestamp: message.createdAt,
              unseenCount: newUnseenCount,
            };
          }
          return room;
        })
      );

      try {
        await db.messages.put(message);
        const room = userRooms.find(r => r.id === message.roomId);
        if (room) {
           await db.rooms.put({
             ...room,
             lastMessage: message.content,
             lastMessageTimestamp: message.createdAt,
             unseenCount: newUnseenCount
           });
        }
      } catch (e) { console.error("DB Sync Error", e); }
    };

    const handleReactionUpdate = ({ action, reaction, messageId }: { action: "added" | "removed"; reaction: Reaction; messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const newReactions =
            action === "added"
              ? [...msg.reactions, reaction]
              : msg.reactions.filter((r) => r.id !== reaction.id);
          return { ...msg, reactions: newReactions };
        })
      );
    };

    const handleMessageDeleted = (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      db.messages.delete(messageId).catch(console.error);
    };

    const handleUserStatus = (user: SimpleUser) => {
      setDmConversations((prev) =>
        prev.map((convo) =>
          convo.id === user.id
            ? { ...convo, isOnline: user.isOnline, lastSeen: user.lastSeen }
            : convo
        )
      );
    };

    socket.on("dm:confirm", handleDmConfirm);
    socket.on("dm:receive", handleDmReceive);
    socket.on("group:receive", handleGroupReceive);
    socket.on("reaction:update", handleReactionUpdate);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("user:status", handleUserStatus);

    return () => {
      socket.off("dm:confirm", handleDmConfirm);
      socket.off("dm:receive", handleDmReceive);
      socket.off("group:receive", handleGroupReceive);
      socket.off("reaction:update", handleReactionUpdate);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("user:status", handleUserStatus);
    };
  }, [socket, currentUser, setMessages, selectedConversation, setDmConversations, setUserRooms, dmConversations, userRooms]);

  useEffect(() => {
    if (socket && userRooms.length > 0) {
      const roomIds = userRooms.map((room) => room.id);
      socket.emit("join:rooms", roomIds);
    }
  }, [socket, userRooms]);

  useEffect(() => {
    if (!currentUser) {
      setLoading({ key: "profile", value: false });
      setError("Please log in to see your network.");
      return;
    }

    const fetchUserProfile = async () => {
      setLoading({ key: "profile", value: true });
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/user/profile/${currentUser.username}`);
        if (!res.ok) throw new Error("Failed to fetch user profile");
        const profile: ChatUserProfile = await res.json();
        const roomsData = profile.rooms?.map((room) => ({ ...room, unseenCount: room.unseenCount || 0 })) || [];
        setUserRooms(roomsData);
        setFollowingList(profile.following || []);
        await db.rooms.bulkPut(roomsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading({ key: "profile", value: false });
      }
    };

    const fetchDmConversations = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chat/dm/conversations/${currentUser.id}`);
        if (!res.ok) throw new Error("Failed to fetch DM conversations");
        const conversations: SimpleUser[] = await res.json();
        const dmsData = conversations.map((convo) => ({ ...convo, unseenCount: convo.unseenCount || 0 }));
        setDmConversations(dmsData);
        await db.dms.bulkPut(dmsData);
      } catch (err) {
        setError(`${err}`);
      }
    };

    fetchUserProfile();
    fetchDmConversations();
  }, [currentUser, setLoading, setError, setUserRooms, setFollowingList, setDmConversations]);

  if (!currentUser && !isLoading.profile) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-gray-400 z-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-200">Loading User...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black font-sans text-gray-200 flex overflow-hidden relative z-0">
      <div className="hidden md:flex h-full w-1/3 lg:w-1/4 border-r border-zinc-800 flex-col">
        <NetworkSidebar />
      </div>
      <div className="grow h-full w-full md:w-2/3 lg:w-3/4 relative flex flex-col">
        {children}
      </div>
    </div>
  );
}
