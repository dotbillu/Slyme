"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { useQueryClient, QueryFunctionContext } from "@tanstack/react-query";
import { Search, Pencil, X, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";

import {
  ConversationItemProps,
  ConversationListProps,
  ChatMapRoom,
  SimpleUser,
  Conversation,
} from "@/lib/types";
import { API_BASE_URL } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  userAtom,
  userRoomsAtom,
  dmConversationsAtom,
  networkLoadingAtom,
  networkErrorAtom,
  isNewChatModalOpenAtom,
  selectedConversationAtom,
  sidebarTransitionLoadingAtom,
  followingListAtom,
  socketAtom,
} from "@store";
import SidebarSkeleton from "../ui/SidebarSkeleton";

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

type ConversationParams = {
  type: "room" | "dm";
  id: string;
  currentUserId: string;
};
type MessagesQueryKey = readonly [string, ConversationParams];
const MESSAGES_PER_PAGE = 30;

const fetchInitialMessages = async ({
  queryKey,
}: QueryFunctionContext<MessagesQueryKey>) => {
  const [, conversation] = queryKey;
  const { type, id, currentUserId } = conversation;
  const url =
    type === "room"
      ? `${API_BASE_URL}/chat/room/${id}/messages?skip=0&take=${MESSAGES_PER_PAGE}`
      : `${API_BASE_URL}/chat/dm/${id}?currentUserId=${currentUserId}&skip=0&take=${MESSAGES_PER_PAGE}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
};

interface ExtendedConversationItemProps extends ConversationItemProps {
  typingName?: string | null;
}

const ConversationItem = React.memo(
  ({
    item,
    type,
    isSelected,
    onClick,
    typingName,
  }: ExtendedConversationItemProps) => {
    const [imgError, setImgError] = useState(false);

    const name = item?.name || "";
    const rawImageUrl = item
      ? type === "room"
        ? (item as ChatMapRoom).imageUrl
        : (item as SimpleUser).image
      : null;

    useEffect(() => {
      setImgError(false);
    }, [rawImageUrl]);

    if (!item) return null;

    const placeholder = `https://placehold.co/40x40/zinc/white?text=${name.charAt(0).toUpperCase()}`;
    const src =
      !imgError && rawImageUrl
        ? rawImageUrl.startsWith("http")
          ? rawImageUrl
          : `${API_BASE_URL}/uploads/${rawImageUrl}`
        : placeholder;

    const lastMessage = item.lastMessage || "";
    const time = formatTimestamp(item.lastMessageTimestamp);
    const unseenCount = item.unseenCount || 0;
    const isUnseen = unseenCount > 0;
    const isOnline = type === "dm" ? (item as SimpleUser).isOnline : false;

    const isTyping = !!typingName;
    const typingText =
      type === "room" && typingName ? `${typingName} is cooking` : "";

    return (
      <motion.button
        layout
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={`
          flex items-center w-full p-3 rounded-lg text-left transition-all mb-1 border-l-4 group relative
          ${
            isSelected
              ? "lg:bg-zinc-800 lg:border-zinc-300 lg:shadow-md border-transparent"
              : "border-transparent lg:hover:bg-zinc-900/60"
          }
        `}
      >
        <div className="relative shrink-0 mr-3">
          <div
            className={`relative w-12 h-12 rounded-full overflow-hidden border ${isSelected ? "lg:border-zinc-500 border-zinc-800" : "border-zinc-800"} bg-zinc-800`}
          >
            <Image
              src={src}
              alt={name}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
              unoptimized={true}
            />
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-sm"></span>
          )}
        </div>

        <div className="grow min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3
              className={`text-sm truncate pr-2 ${isUnseen ? "font-bold text-white" : "font-medium text-zinc-200 group-hover:text-zinc-100"}`}
            >
              {name}
            </h3>
            <span
              className={`text-[10px] shrink-0 ${isUnseen || isTyping ? "text-white font-bold" : "text-zinc-500"}`}
            >
              {time}
            </span>
          </div>
          <div className="flex justify-between items-center">
            {isTyping ? (
              <p className="text-xs truncate max-w-[80%] text-white font-semibold italic animate-pulse">
                <span className="loading loading-dots loading-xs text-white mr-1 align-bottom"></span>
                {typingText}
              </p>
            ) : (
              <p
                className={`text-xs truncate max-w-[80%] ${isUnseen ? "text-zinc-100 font-semibold" : "text-zinc-500 group-hover:text-zinc-400"}`}
              >
                {lastMessage || (
                  <span className="italic text-zinc-700">No messages</span>
                )}
              </p>
            )}

            {!isTyping && isUnseen && (
              <div className="shrink-0 flex items-center justify-center bg-zinc-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 shadow-lg shadow-zinc-300">
                {unseenCount > 99 ? "99+" : unseenCount}
              </div>
            )}
          </div>
        </div>
      </motion.button>
    );
  },
);
ConversationItem.displayName = "ConversationItem";

interface ExtendedConversationListProps extends ConversationListProps {
  typingStates: Record<string, string | null>;
}

const ConversationList: React.FC<ExtendedConversationListProps> = ({
  items,
  searchTerm,
  typingStates,
}) => {
  const [selectedConversation, setSelectedConversation] = useAtom(
    selectedConversationAtom,
  );
  const router = useRouter();
  const [user] = useAtom(userAtom);
  const [, setUserRooms] = useAtom(userRoomsAtom);
  const [, setDmConversations] = useAtom(dmConversationsAtom);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelect = async (item: Conversation) => {
    if (selectedConversation?.data.id !== item.id) {
      if (item.type === "room") {
        setSelectedConversation({ type: "room", data: item as ChatMapRoom });
      } else {
        setSelectedConversation({ type: "dm", data: item as SimpleUser });
      }
      router.push(`/network/${item.id}`);
    }

    if ((item.unseenCount || 0) > 0) {
      if (item.type === "room") {
        setUserRooms((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, unseenCount: 0 } : i)),
        );
        try {
          const room = await db.rooms.get(item.id);
          if (room) await db.rooms.put({ ...room, unseenCount: 0 });
        } catch (e) {}
      } else {
        setDmConversations((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, unseenCount: 0 } : i)),
        );
        try {
          const dm = await db.dms.get(item.id);
          if (dm) await db.dms.put({ ...dm, unseenCount: 0 });
          if (user) {
            fetch(`${API_BASE_URL}/chat/dm/mark-read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currentUserId: user.id,
                otherUserId: item.id,
              }),
            }).catch((e) => console.error("Mark read failed", e));
          }
        } catch (e) {
          console.log(`${e}`);
        }
      }
    }
  };
  if (filteredItems.length === 0 && searchTerm) {
    return (
      <div className="p-4 text-center text-zinc-600 text-xs">
        No results found.
      </div>
    );
  }

  return (
    <div className="px-2 pb-2">
      {filteredItems.map((item) => (
        <ConversationItem
          key={item.id}
          item={item}
          type={item.type}
          isSelected={item.id === selectedConversation?.data.id}
          typingName={typingStates[item.id]}
          onClick={() => handleSelect(item)}
        />
      ))}
    </div>
  );
};

const NewChatModal: React.FC = () => {
  const router = useRouter();
  const [followingList] = useAtom(followingListAtom);
  const [, setIsModalOpen] = useAtom(isNewChatModalOpenAtom);
  const [, setDmConversations] = useAtom(dmConversationsAtom);
  const [, setSelectedConversation] = useAtom(selectedConversationAtom);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredFollowing = followingList.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleStartChat = () => {
    if (!selectedUserId) return;
    const userToChat = followingList.find((u) => u.id === selectedUserId);
    if (!userToChat) return;
    const simpleUser: SimpleUser = {
      id: userToChat.id,
      username: userToChat.username,
      name: userToChat.name,
      image: userToChat.image,
      lastMessage: userToChat.lastMessage,
      lastMessageTimestamp: userToChat.lastMessageTimestamp,
    };
    setIsModalOpen(false);
    setDmConversations((prev) => {
      const existing = prev.find((d) => d.id === simpleUser.id);
      return existing ? prev : [simpleUser, ...prev];
    });
    setSelectedConversation({ type: "dm", data: simpleUser });
    router.push(`/network/${simpleUser.id}`);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center backdrop-blur-sm"
      onClick={() => setIsModalOpen(false)}
    >
      <div
        className="bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md m-4 flex flex-col h-[70vh] border border-zinc-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <div className="w-6" />
          <h2 className="text-base font-bold text-white">New Message</h2>
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-zinc-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-zinc-900 rounded-lg px-4 py-2 text-sm text-white focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grow overflow-y-auto p-2 custom-scrollbar space-y-1">
          {filteredFollowing.map((user) => (
            <div
              key={user.id}
              onClick={() =>
                setSelectedUserId(selectedUserId === user.id ? null : user.id)
              }
              className={`flex items-center p-3 rounded-xl cursor-pointer ${selectedUserId === user.id ? "bg-zinc-800 border " : "hover:bg-zinc-900 border border-transparent"}`}
            >
              {user.image ? (
                <img
                  src={user.image}
                  className="w-10 h-10 rounded-full mr-3 object-cover"
                  alt={user.name}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mr-3 border border-zinc-700">
                  <UserIcon size={18} className="text-zinc-400" />
                </div>
              )}
              <div className="text-sm font-medium text-white">{user.name}</div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-800">
          <button
            disabled={!selectedUserId}
            onClick={handleStartChat}
            className="w-full bg-white text-black font-bold py-3 rounded-xl disabled:opacity-50"
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default function NetworkSidebar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);

  const [user] = useAtom(userAtom);
  const [userRooms] = useAtom(userRoomsAtom);
  const [dmConversations] = useAtom(dmConversationsAtom);
  const [loading] = useAtom(networkLoadingAtom);
  const [error] = useAtom(networkErrorAtom);
  const [isModalOpen, setIsModalOpen] = useAtom(isNewChatModalOpenAtom);
  const [isTransitioning] = useAtom(sidebarTransitionLoadingAtom);
  const [socket] = useAtom(socketAtom);
  const queryClient = useQueryClient();

  const [typingStates, setTypingStates] = useState<
    Record<string, string | null>
  >({});

  const localRooms = useLiveQuery(() => db.rooms.toArray(), []);
  const localDms = useLiveQuery(() => db.dms.toArray(), []);

  const combinedAndSortedConversations = useMemo<Conversation[]>(() => {
    const safeLocalRooms = localRooms || [];
    const safeLocalDms = localDms || [];

    const mergeItems = <T extends ChatMapRoom | SimpleUser>(
      stateItems: T[],
      localItems: T[],
      type: "room" | "dm",
    ): Conversation[] => {
      const baseItems = stateItems.length > 0 ? stateItems : localItems;
      return baseItems.map((item) => {
        const local = localItems.find((l) => l.id === item.id);
        let finalUnseen = item.unseenCount || 0;
        if (local && (local.unseenCount || 0) > finalUnseen) {
          finalUnseen = local.unseenCount || 0;
        }
        return { ...item, unseenCount: finalUnseen, type } as Conversation;
      });
    };

    const mergedRooms = mergeItems(userRooms, safeLocalRooms, "room");
    const mergedDms = mergeItems(dmConversations, safeLocalDms, "dm");

    return [...mergedRooms, ...mergedDms].sort((a, b) => {
      const timeA = new Date(a.lastMessageTimestamp || 0).getTime();
      const timeB = new Date(b.lastMessageTimestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [userRooms, dmConversations, localRooms, localDms]);

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: {
      conversationId: string;
      name: string;
    }) => {
      setTypingStates((prev) => ({
        ...prev,
        [data.conversationId]: data.name,
      }));
    };

    const handleUserStoppedTyping = (data: { conversationId: string }) => {
      setTypingStates((prev) => ({ ...prev, [data.conversationId]: null }));
    };

    const handleIncomingMessage = (msg: {
      roomId?: string;
      senderId: string;
    }) => {
      const idToClear = msg.roomId || msg.senderId;
      setTypingStates((prev) => ({ ...prev, [idToClear]: null }));
    };

    socket.on("user:typing", handleUserTyping);
    socket.on("user:stopped-typing", handleUserStoppedTyping);
    socket.on("dm:message", handleIncomingMessage);
    socket.on("group:message", handleIncomingMessage);

    return () => {
      socket.off("user:typing", handleUserTyping);
      socket.off("user:stopped-typing", handleUserStoppedTyping);
      socket.off("dm:message", handleIncomingMessage);
      socket.off("group:message", handleIncomingMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (user && combinedAndSortedConversations.length > 0) {
      combinedAndSortedConversations.slice(0, 5).forEach((conv) => {
        const queryKey = [
          "chat",
          { type: conv.type, id: conv.id, currentUserId: user.id },
        ] as MessagesQueryKey;
        queryClient.prefetchInfiniteQuery({
          queryKey,
          queryFn: fetchInitialMessages,
          initialPageParam: 0,
          getNextPageParam: () => undefined,
          staleTime: 1000 * 60 * 5,
        });
      });
    }
  }, [combinedAndSortedConversations, user, queryClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isExpanded = isFocused || searchTerm.length > 0;
  const shouldShowSkeleton =
    (loading.profile && combinedAndSortedConversations.length === 0) ||
    isTransitioning;

  return (
    <div className="flex flex-col w-full h-full bg-black border-r border-zinc-800 mt-2 relative">
      {isModalOpen && <NewChatModal />}

      <div className="flex items-center gap-2 px-3 py-3 shrink-0">
        <div className="grow" ref={searchBarRef}>
          <div
            className={`relative flex items-center rounded-full transition-all duration-200 ${isExpanded ? "bg-zinc-800 ring-1 ring-zinc-700" : "bg-zinc-900"}`}
          >
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${isExpanded ? "text-white" : "text-zinc-500"}`}
            />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-9 pr-8 py-2.5 rounded-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
            />
            {isExpanded && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setIsFocused(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-700 transition-colors"
              >
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2.5 rounded-full text-white shadow-lg shadow-indigo-900/20 transition-all shrink-0 cursor-pointer"
        >
          <Pencil size={18} />
        </button>
      </div>

      <div className="grow overflow-y-auto custom-scrollbar px-2 mt-2">
        {shouldShowSkeleton ? (
          <SidebarSkeleton />
        ) : (
          !error && (
            <ConversationList
              items={combinedAndSortedConversations}
              searchTerm={searchTerm}
              typingStates={typingStates}
            />
          )
        )}
      </div>
    </div>
  );
}
