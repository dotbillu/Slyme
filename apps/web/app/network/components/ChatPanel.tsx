"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Check, SmilePlus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import ChatInput from "./ChatInput";
import {
  MessageType,
  SimpleUser,
  DirectMessage,
  GroupMessage,
  TypingUser,
  MessageBubbleProps,
  MessageListProps,
  ChatPanelProps,
  User,
} from "@/lib/types";
import { API_BASE_URL } from "@/lib/constants";
import { db } from "@/lib/db";
import { useChatMessages } from "@/hooks/useChatMessages";
import ChatPanelSkeleton from "../ui/ChatPanelSkeleton";
import EmojiPicker from "../ui/EmojiPicker";
import DateHeader from "../ui/DateHeader";
import {
  selectedConversationAtom,
  networkErrorAtom,
  userAtom,
  messagesAtom,
  socketAtom,
  keysAtom,
} from "@store";

// --- IMPORT ENCRYPTION LOGIC ---
import { encryptMessage, decryptMessage } from "@/lib/crypt";

const SCROLL_THRESHOLD = 200;

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "";
  const date = new Date(lastSeen);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  return `Last seen ${days}d ago`;
}

const formatDate = (date: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  if (targetDate.getTime() === today.getTime()) return "Today";
  if (targetDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const toSimpleUser = (user: User): SimpleUser => ({
  id: user.id,
  username: user.username,
  name: user.name,
  image: user.image || null,
  isOnline: true,
  lastMessage: null,
  lastMessageTimestamp: null,
  publicKey: user.publicKey, 
});

interface ExtendedMessageBubbleProps extends MessageBubbleProps {
  shouldAnimate: boolean;
}

const MessageBubble: React.FC<ExtendedMessageBubbleProps> = ({
  message,
  isMe,
  isGroup,
  onDelete,
  onToggleReaction,
  spacing,
  shouldAnimate,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const senderName = message.sender?.name || "Unknown";
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const placeholder = `https://placehold.co/40x40/374151/white?text=${senderName.charAt(0).toUpperCase()}`;
  const rawImage = message.sender?.image;
  const src = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${API_BASE_URL}/uploads/${rawImage}`
    : placeholder;

  const groupedReactions = message.reactions
    ? message.reactions.reduce(
        (acc, reaction) => {
          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};

  const hasReactions = Object.entries(groupedReactions).length > 0;

  return (
    <div
      id={`message-${message.id}`}
      className={`flex group ${isMe ? "justify-end" : "justify-start"} ${spacing === "large" ? "mt-6" : "mt-2"} ${hasReactions ? "mb-8" : ""}`}
    >
      <div
        className={`flex items-center max-w-xs md:max-w-md lg:max-w-lg gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isMe && (
          <Link
            href={`/profile/${message.sender?.username || "#"}`}
            className="self-end"
          >
            <img
              src={src}
              onError={(e) => (e.currentTarget.src = placeholder)}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover mb-1 shrink-0"
            />
          </Link>
        )}
        {isMe && <div className="w-8 h-8 shrink-0" />}

        <motion.div
          layout
          {...(shouldAnimate
            ? {
                initial: { opacity: 0, y: 5, scale: 0.95 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { type: "spring", stiffness: 500, damping: 30 },
              }
            : {
                initial: false,
                animate: false,
              })}
          className={`px-3 py-2 rounded-2xl shadow-sm relative ${isMe ? "bg-indigo-600 text-white rounded-br-none origin-bottom-right" : "bg-[#262626] text-gray-200 rounded-bl-none origin-bottom-left"}`}
        >
          {isGroup && !isMe && (
            <Link
              href={`/profile/${message.sender?.username || "#"}`}
              className="text-xs font-bold text-indigo-400 mb-1 hover:underline"
            >
              {senderName}
            </Link>
          )}
          <p
            className="text-sm"
            style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
          >
            {message.content}
          </p>
          <div
            className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-indigo-200" : "text-gray-400"}, text-xs`}
          >
            <span>{timestamp}</span>
            {isMe && <Check size={16} />}
          </div>

          {hasReactions && (
            <div className="absolute -bottom-4 right-0 flex gap-1 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 shadow-md z-10">
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <span key={emoji} className="text-xs">
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        <div className="relative flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-center">
          <button
            onClick={() => setShowEmojiPicker((p) => !p)}
            className="text-gray-400 hover:text-gray-200"
          >
            <SmilePlus size={18} />
          </button>
          {isMe && (
            <button
              onClick={() => onDelete(message.id as string)}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 size={18} />
            </button>
          )}
          {showEmojiPicker && (
            <div
              className={`absolute z-10 ${isMe ? "right-full mr-55" : "left-full ml-2"} -top-2`}
            >
              <EmojiPicker
                onSelect={(emoji) => {
                  onToggleReaction(message.id as string, emoji);
                  setShowEmojiPicker(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ExtendedMessageListProps extends MessageListProps {
  allowAnimations: boolean;
}

const MessageList = React.memo(
  ({
    messages,
    currentUser,
    selectedConversation,
    onDelete,
    onToggleReaction,
    allowAnimations,
  }: ExtendedMessageListProps) => {
    let lastDateString: string | null = null;
    let lastMessageTimestamp: Date | null = null;
    let lastSenderId: string | null = null;
    const FIVE_MINUTES = 5 * 60 * 1000;

    return (
      <div className="flex flex-col justify-end min-h-full pb-2">
        {messages.map((msg) => {
          if (!msg || !msg.createdAt) return null;
          const messageDate = new Date(msg.createdAt);
          const messageDateString = formatDate(messageDate);
          let showDateHeader = false;
          if (messageDateString !== lastDateString) {
            showDateHeader = true;
            lastDateString = messageDateString;
          }
          let spacing: "small" | "large" = "large";
          if (
            !showDateHeader &&
            lastMessageTimestamp &&
            msg.senderId === lastSenderId &&
            messageDate.getTime() - lastMessageTimestamp.getTime() <
              FIVE_MINUTES
          ) {
            spacing = "small";
          }
          lastMessageTimestamp = messageDate;
          lastSenderId = msg.senderId;
          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && <DateHeader date={messageDateString} />}
              <MessageBubble
                message={msg}
                isMe={msg.senderId === currentUser.id}
                isGroup={selectedConversation.type === "room"}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
                spacing={spacing}
                shouldAnimate={allowAnimations}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);
MessageList.displayName = "MessageList";

const ChatPanel: React.FC<ChatPanelProps> = () => {
  const [currentUser] = useAtom(userAtom);
  const [keys] = useAtom(keysAtom); 
  const [selectedConversation] = useAtom(selectedConversationAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [error, setError] = useAtom(networkErrorAtom);
  const [socket] = useAtom(socketAtom);

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isCacheLoading, setIsCacheLoading] = useState(true);
  const [headerImgError, setHeaderImgError] = useState(false);
  const [allowAnimations, setAllowAnimations] = useState(false);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const oldScrollHeightRef = useRef(0);
  const isInitialLoad = useRef(true);

  const selectedConversationRef = useRef(selectedConversation);
  const currentUserRef = useRef(currentUser);
  
  // Use Refs for Keys to access them inside socket listeners without stale closures
  const keysRef = useRef(keys);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    currentUserRef.current = currentUser;
    keysRef.current = keys;
  }, [selectedConversation, currentUser, keys]);

  // --- ENCRYPTION HELPER ---
  const decryptContent = useCallback((msg: MessageType, currentKeys?: any, currentUserData?: any): string => {
    // 1. Get Private Key (Prefer passed keys, then ref, then object)
    const privKey = currentKeys?.privateKey || keysRef.current?.privateKey || currentUserData?.privateKey;

    if (msg.roomId || !msg.nonce || !privKey) {
        return msg.content;
    }
    
    // Determine the public key of the OTHER person
    const meId = currentUserData?.id || currentUserRef.current?.id;
    const isMeSender = msg.senderId === meId;
    
    let otherPublicKey = "";

    // IMPORTANT: We use selectedConversationRef to be safe in async callbacks
    const currentConvo = selectedConversationRef.current;

    if (isMeSender) {
        // If I sent it, decrypt using the Recipient's Public Key
        if(currentConvo?.type === 'dm' && currentConvo.data.id === msg.recipientId) {
            otherPublicKey = (currentConvo.data as SimpleUser).publicKey || "";
        }
    } else {
        // If I received it, decrypt using the Sender's Public Key
        if(currentConvo?.type === 'dm' && currentConvo.data.id === msg.senderId) {
             otherPublicKey = (currentConvo.data as SimpleUser).publicKey || "";
        } else {
             otherPublicKey = msg.sender?.publicKey || "";
        }
    }

    if (!otherPublicKey) return "Encrypted message";

    try {
        const decrypted = decryptMessage(
            privKey, 
            otherPublicKey, 
            msg.content, 
            msg.nonce
        );
        return decrypted || "Failed to decrypt";
    } catch (e) {
        return "Decryption Error";
    }
  }, []);

  // Initial Load from DB (Cache)
  useEffect(() => {
    if (!selectedConversation || !currentUser) return;

    setIsCacheLoading(true);
    setAllowAnimations(false);
    setMessages([]);
    setHeaderImgError(false);

    const loadFromCache = async () => {
      let cachedMsgs = [];
      try {
        if (selectedConversation.type === "room") {
          cachedMsgs = await db.messages
            .where("roomId")
            .equals(selectedConversation.data.id)
            .toArray();
        } else {
          const myId = String(currentUser.id);
          const otherId = String(selectedConversation.data.id);
          cachedMsgs = await db.messages
            .filter((msg) => {
              if (msg.roomId) return false;
              const sId = String(msg.senderId);
              const rId = String(msg.recipientId);
              return (
                (sId === myId && rId === otherId) ||
                (sId === otherId && rId === myId)
              );
            })
            .toArray();
        }

        if (cachedMsgs.length > 0) {
          cachedMsgs.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          
          // Decrypt loaded messages
          const decryptedMsgs = cachedMsgs.map(msg => ({
             ...msg,
             content: decryptContent(msg as MessageType, keys, currentUser)
          }));

          setMessages(decryptedMsgs);
          
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop =
              scrollContainerRef.current.scrollHeight;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCacheLoading(false);
        isInitialLoad.current = true;
        setTimeout(() => setAllowAnimations(true), 100);
      }
    };

    loadFromCache();
  }, [selectedConversation?.data.id, currentUser, setMessages, decryptContent, keys]);

  // Handle messages fetched via React Query (API)
  const {
    data: fetchedMessages,
    isLoading: isLoadingMessages,
    isFetchingNextPage: isLoadingMore,
    fetchNextPage,
    hasNextPage,
    isError,
  } = useChatMessages(selectedConversation);

  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      const sorted = [...fetchedMessages].reverse();
      
      // Save ENCRYPTED version to DB
      db.messages.bulkPut(sorted).catch((err) => console.error(err));

      // Decrypt for UI
      const decryptedSorted = sorted.map(msg => ({
          ...msg,
          content: decryptContent(msg as MessageType, keys, currentUser)
      }));

      setMessages(decryptedSorted);
    }
  }, [fetchedMessages, setMessages, decryptContent, keys, currentUser]);

  useEffect(() => {
    setTypingUsers([]);
  }, [selectedConversation?.data.id]);

  useEffect(() => {
    setError(isError ? "Failed to fetch messages" : null);
  }, [isError, setError]);

  useLayoutEffect(() => {
    if (isCacheLoading || !scrollContainerRef.current) return;

    if (oldScrollHeightRef.current > 0 && !isLoadingMore) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight - oldScrollHeightRef.current;
      oldScrollHeightRef.current = 0;
      return;
    }

    if (messages.length > 0) {
      if (isInitialLoad.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
        isInitialLoad.current = false;
      } else {
        const { scrollTop, scrollHeight, clientHeight } =
          scrollContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 200) {
          messagesEndRef.current?.scrollIntoView();
        }
      }
    }
  }, [messages, isLoadingMore, isCacheLoading]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: TypingUser) => {
      const currentConvo = selectedConversationRef.current;
      if (
        currentConvo &&
        String(data.conversationId) === String(currentConvo.data.id)
      ) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.name === data.name)) return prev;
          return [...prev, data];
        });
      }
    };

    const handleUserStoppedTyping = (data: {
      conversationId: string;
      name?: string;
    }) => {
      const currentConvo = selectedConversationRef.current;
      if (
        currentConvo &&
        String(data.conversationId) === String(currentConvo.data.id)
      ) {
        setTypingUsers((prev) => {
          if (data.name) return prev.filter((u) => u.name !== data.name);
          return [];
        });
      }
    };

    const handleIncomingMessage = (msg: MessageType) => {
      const currentConvo = selectedConversationRef.current;
      const currentUser = currentUserRef.current;
      if (!currentConvo || !currentUser) return;

      setTypingUsers((prev) => prev.filter((u) => u.name !== msg.sender?.name));

      let isForCurrentConvo = false;
      if (currentConvo.type === "room") {
        if (String(msg.roomId) === String(currentConvo.data.id))
          isForCurrentConvo = true;
      } else if (currentConvo.type === "dm") {
        const msgSender = String(msg.senderId);
        const msgRecipient = String(msg.recipientId);
        const currentId = String(currentUser.id);
        const convoId = String(currentConvo.data.id);
        if (
          (msgSender === convoId && msgRecipient === currentId) ||
          (msgSender === currentId && msgRecipient === convoId)
        ) {
          isForCurrentConvo = true;
        }
      }

      // 1. Save ENCRYPTED message to DB
      db.messages.put(msg).catch(console.error);

      if (isForCurrentConvo) {
        // 2. DECRYPT IMMEDIATELY for UI
        // We pass the refs directly to ensure we have the latest keys inside this callback
        const decryptedMsg = {
             ...msg,
             content: decryptContent(msg, keysRef.current, currentUser)
        };
        
        setMessages((prev) => {
            // Check if we already have this message (e.g. optimistic update)
            // If we do, we replace it. If not, append.
            const exists = prev.some(m => m.id === msg.id);
            if(exists) return prev; 
            return [...prev, decryptedMsg];
        });

        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          50,
        );
      }
    };

    socket.on("user:typing", handleUserTyping);
    socket.on("user:stopped-typing", handleUserStoppedTyping);
    socket.on("group:message", handleIncomingMessage);
    socket.on("dm:message", handleIncomingMessage);

    return () => {
      socket.off("user:typing", handleUserTyping);
      socket.off("user:stopped-typing", handleUserStoppedTyping);
      socket.off("group:message", handleIncomingMessage);
      socket.off("dm:message", handleIncomingMessage);
    };
  }, [socket, setMessages, decryptContent]);

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    if (selectedConversation?.type === "dm") {
      return (
        <div className="ml-4 mb-2 mt-2">
          <span className="loading loading-dots loading-sm text-zinc-400"></span>
        </div>
      );
    }
    const names = typingUsers.map((u) => u.name);
    const text =
      names.length <= 3
        ? names.join(", ")
        : `${names.slice(0, 3).join(", ")}...`;
    return (
      <div className="ml-4 mb-2 mt-2 flex items-center gap-2 animate-pulse">
        <span className="loading loading-dots loading-xs text-zinc-400"></span>
        <span className="text-xs text-zinc-500 font-medium">
          {text} is typing...
        </span>
      </div>
    );
  };

  const handleScroll = () => {
    if (
      scrollContainerRef.current &&
      scrollContainerRef.current.scrollTop < SCROLL_THRESHOLD
    ) {
      if (isLoadingMore || !hasNextPage) return;
      oldScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
      fetchNextPage();
    }
  };

  const handleBack = () => {
    router.push("/network");
  };

  const handleSendMessage = async (content: string) => {
    if (
      !selectedConversation ||
      content.trim() === "" ||
      !currentUser ||
      !socket
    )
      return;

    const tempId = crypto.randomUUID();
    const tempSender = toSimpleUser(currentUser);
    
    // --- ENCRYPT MESSAGE LOGIC ---
    let finalContent = content; 
    let nonce: string | undefined = undefined;
    
    // Use keys from ref or atom
    const myPrivateKey = keys?.privateKey || currentUser.privateKey;

    if(selectedConversation.type === 'dm') {
        const recipientUser = selectedConversation.data as SimpleUser;
        if(myPrivateKey && recipientUser.publicKey) {
             const encrypted = encryptMessage(
                myPrivateKey,
                recipientUser.publicKey,
                content
             );
             finalContent = encrypted.ciphertext;
             nonce = encrypted.nonce;
        } else {
             console.warn("Missing keys, sending plaintext");
        }
    }

    const tempMessageBase = {
      id: tempId,
      createdAt: new Date().toISOString(),
      senderId: currentUser.id,
      sender: tempSender,
      reactions: [],
      isOptimistic: true,
      nonce: nonce, 
    };

    let tempMessageForState: MessageType; 
    let messageToSave: MessageType;       
    
    let eventName = "";
    let payload = {};

    if (selectedConversation.type === "room") {
      eventName = "group:send";
      payload = {
        senderId: currentUser.id,
        roomId: selectedConversation.data.id,
        content: finalContent,
        tempId,
      };
      
      const common = {
        ...tempMessageBase,
        roomId: selectedConversation.data.id,
        content: content 
      } as GroupMessage;
      
      tempMessageForState = common;
      messageToSave = common;

    } else {
      eventName = "dm:send";
      payload = {
        senderId: currentUser.id,
        recipientId: selectedConversation.data.id,
        content: finalContent, 
        nonce: nonce,          
        tempId,
      };
      
      // 1. Show PLAINTEXT in UI immediately
      tempMessageForState = {
        ...tempMessageBase,
        recipientId: selectedConversation.data.id,
        content: content, 
      } as DirectMessage;

      // 2. Save CIPHERTEXT to DB/Socket
      messageToSave = {
        ...tempMessageBase,
        recipientId: selectedConversation.data.id,
        content: finalContent, 
      } as DirectMessage;
    }

    setMessages((prev) => [...prev, tempMessageForState]);
    db.messages.put(messageToSave).catch(console.error);
    socket.emit(eventName, payload);
    
    setTimeout(
      () =>
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        }),
      50,
    );
  };

  const handleDeleteMessage = async (messageId: number | string) => {
    if (!currentUser || !selectedConversation || !socket) return;
    const messageType = selectedConversation.type === "room" ? "group" : "dm";
    const oldMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await db.messages.delete(messageId);
    try {
      socket.emit("message:delete", {
        userId: currentUser.id,
        messageId: messageId as string,
        messageType,
      });
    } catch (err) {
      setError(`failed : ${err}`);
      setMessages(oldMessages);
    }
  };

  const handleToggleReaction = async (
    messageId: number | string,
    emoji: string,
  ) => {
    if (!currentUser || !selectedConversation || !socket) return;
    const messageType = selectedConversation.type === "room" ? "group" : "dm";
    const calculateReactions = (msg: MessageType) => {
      const existingReaction = msg.reactions?.find(
        (r) => r.emoji === emoji && r.user.id === currentUser.id,
      );
      const reactions = msg.reactions || [];
      return existingReaction
        ? reactions.filter((r) => r.id !== existingReaction.id)
        : [
            ...reactions,
            { id: crypto.randomUUID(), emoji, user: toSimpleUser(currentUser) },
          ];
    };

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, reactions: calculateReactions(msg) }
          : msg,
      ),
    );
    const msg = await db.messages.get(messageId);
    if (msg)
      await db.messages.update(messageId, {
        reactions: calculateReactions(msg),
      });

    socket.emit("reaction:toggle", {
      userId: currentUser.id,
      emoji,
      groupMessageId: messageType === "group" ? messageId : undefined,
      directMessageId: messageType === "dm" ? messageId : undefined,
    });
  };

  if (!selectedConversation) return null;
  if (isCacheLoading) return <ChatPanelSkeleton />;

  const name = selectedConversation.data.name;
  const rawImageUrl =
    selectedConversation.type === "room"
      ? selectedConversation.data.imageUrl
      : (selectedConversation.data as SimpleUser).image;
  const placeholder = `https://placehold.co/40x40/4f46e5/white?text=${name.charAt(0).toUpperCase()}`;
  const src =
    !headerImgError && rawImageUrl
      ? rawImageUrl.startsWith("http")
        ? rawImageUrl
        : `${API_BASE_URL}/uploads/${rawImageUrl}`
      : placeholder;
  const isDM = selectedConversation.type === "dm";
  const convoData = selectedConversation.data as SimpleUser;
  const statusText = convoData.isOnline
    ? "online"
    : formatLastSeen(convoData.lastSeen);

  return (
    <div className="flex flex-col h-full w-full bg-black relative overflow-hidden ml-2">
      <div className="flex-none flex items-center p-3 bg-black border-b border-zinc-800 z-10">
        <button
          onClick={handleBack}
          className="md:hidden mr-3 text-zinc-400 hover:text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <Link
          href={
            isDM
              ? `/profile/${(selectedConversation.data as SimpleUser).username}`
              : "#"
          }
        >
          <Image
            src={src}
            alt={name}
            width={40}
            height={40}
            onError={() => setHeaderImgError(true)}
            className="w-10 h-10 rounded-full object-cover mr-3"
            unoptimized
          />
        </Link>
        <div className="grow min-w-0">
          <Link
            href={
              isDM
                ? `/profile/${(selectedConversation.data as SimpleUser).username}`
                : "#"
            }
            className="font-bold text-white hover:underline truncate block"
          >
            {name}
          </Link>
          {isDM ? (
            <span
              className={`text-xs block truncate ${convoData.isOnline ? "text-white" : "text-zinc-500"}`}
            >
              {statusText}
            </span>
          ) : (
            <span className="text-xs text-zinc-500 block">Group</span>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto bg-black custom-scrollbar"
      >
        {isLoadingMore && (
          <div className="flex justify-center my-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          </div>
        )}
        {!messages && isLoadingMessages ? (
          <div className="flex justify-center items-center h-full text-zinc-600">
            Loading...
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="flex justify-center items-center h-full text-zinc-600">
                No messages yet.
              </div>
            )}
            {currentUser && selectedConversation && (
              <MessageList
                messages={messages}
                currentUser={toSimpleUser(currentUser)}
                selectedConversation={selectedConversation}
                onDelete={handleDeleteMessage}
                onToggleReaction={handleToggleReaction}
                allowAnimations={allowAnimations}
              />
            )}
            {renderTypingIndicator()}
          </>
        )}
        {error && <div className="p-4 text-center text-red-500">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none w-full bg-black z-10">
        <ChatInput
          onSend={handleSendMessage}
          onGetSendButtonPosition={() => {}}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
