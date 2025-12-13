"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
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
import { useChatMessages } from "@/hooks/useChatMessages";
import ChatPanelSkeleton from "../ui/ChatPanelSkeleton";
import DateHeader from "../ui/DateHeader";
import {
  selectedConversationAtom,
  networkErrorAtom,
  userAtom,
  messagesAtom,
  socketAtom,
} from "@store";
import {
  formatDate,
  formatLastSeen,
  handleIncomingMessage,
  handleUserStoppedTyping,
  handleUserTyping,
  handleConversationSeen,
  toSimpleUser,
} from "../service";

const SCROLL_THRESHOLD = 200;


// MessageBubble {{{
const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  isGroup,
  onDelete,
  spacing,
  shouldAnimate,
}) => {
  const [imgError, setImgError] = useState(false);

  const senderName = message.sender?.name || "Unknown";

  const placeholder = `https://placehold.co/40x40/374151/white?text=${senderName.charAt(0).toUpperCase()}`;
  const rawImage = message.sender?.image;
  const src = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${API_BASE_URL}/uploads/${rawImage}`
    : placeholder;

  return (
    <div
      id={`message-${message.id}`}
      className={`flex group w-full px-3 ${
        isMe ? "justify-end" : "justify-start pl-2"
      } ${spacing === "large" ? "mt-2" : "mt-1"}`}
    >
      <div
        className={`flex items-center max-w-[85%] md:max-w-[70%] lg:max-w-[60%] gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isMe && isGroup && (
          <Link
            href={`/profile/${message.sender?.username || "#"}`}
            className="self-end"
          >
            <Image
              src={imgError ? placeholder : src}
              alt={senderName}
              width={32}
              height={32}
              onError={() => setImgError(true)}
              className="w-8 h-8 rounded-full object-cover mb-1 shrink-0"
              unoptimized
            />
          </Link>
        )}

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
        </motion.div>

        {/* --- Trash Button --- */}
        <div className="relative flex flex-col items-center gap-2 transition-opacity self-center opacity-0 group-hover:opacity-100">
          {isMe && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(message.id as string);
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// }}}

// MessageList {{{
const MessageList = React.memo(
  ({
    messages,
    currentUser,
    selectedConversation,
    onDelete,
    allowAnimations,
    onToggleReaction,
  }: MessageListProps) => {
    let lastDateString: string | null = null;
    let lastMessageTimestamp: Date | null = null;
    let lastSenderId: string | null = null;
    const FIVE_MINUTES = 5 * 60 * 1000;

    const myMessages = messages.filter((m) => m.senderId === currentUser.id);
    const lastSentMessageId =
      myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null;

    return (
      <div className="flex flex-col justify-end min-h-full pb-2">
        {messages.map((msg) => {
          if (!msg || !msg.createdAt) return null;
          const messageDate = new Date(msg.createdAt);
          const messageDateString = formatDate(messageDate);

          let showDateHeader = false;
          let showTimeSeparator = false;

          if (messageDateString !== lastDateString) {
            showDateHeader = true;
            lastDateString = messageDateString;
          } else if (lastMessageTimestamp) {
            const timeDiff =
              messageDate.getTime() - lastMessageTimestamp.getTime();
            if (timeDiff > FIVE_MINUTES) {
              showTimeSeparator = true;
            }
          }

          let spacing: "small" | "large" = "large";
          if (
            !showDateHeader &&
            !showTimeSeparator &&
            lastMessageTimestamp &&
            msg.senderId === lastSenderId
          ) {
            spacing = "small";
          }

          lastMessageTimestamp = messageDate;
          lastSenderId = msg.senderId;

          const isLastSentByMe = msg.id === lastSentMessageId;

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && <DateHeader date={messageDateString} />}

              {showTimeSeparator && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-zinc-500 font-medium">
                    {messageDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              <MessageBubble
                message={msg}
                isMe={msg.senderId === currentUser.id}
                isGroup={selectedConversation.type === "room"}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
                spacing={spacing}
                shouldAnimate={allowAnimations}
              />

              {isLastSentByMe && msg.isRead && (
                <div className="flex justify-end pr-3 mt-1 mb-2">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Seen
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);
MessageList.displayName = "MessageList";

// }}}

// ChatPanel {{{
const ChatPanel: React.FC<ChatPanelProps> = () => {
  const [currentUser] = useAtom(userAtom);
  const [selectedConversation] = useAtom(selectedConversationAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [error, setError] = useAtom(networkErrorAtom);
  const [socket] = useAtom(socketAtom);

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [headerImgError, setHeaderImgError] = useState(false);
  const [allowAnimations, setAllowAnimations] = useState(false);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const oldScrollHeightRef = useRef(0);
  const isInitialLoad = useRef(true);

  const selectedConversationRef = useRef(selectedConversation);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    currentUserRef.current = currentUser;
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    if (!selectedConversation || !currentUser) return;
    setAllowAnimations(false);
    setMessages([]);
    setHeaderImgError(false);
    isInitialLoad.current = true;
    setTimeout(() => setAllowAnimations(true), 100);
  }, [
    selectedConversation?.data.id,
    currentUser,
    selectedConversation,
    setMessages,
  ]);

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
      setMessages(sorted);
    }
  }, [fetchedMessages, setMessages]);

  useEffect(() => {
    setTypingUsers([]);
  }, [selectedConversation?.data.id]);

  useEffect(() => {
    setError(isError ? "Failed to fetch messages" : null);
  }, [isError, setError]);

  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
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
  }, [messages, isLoadingMore]);

  useEffect(() => {
    if (selectedConversation && socket && currentUser && messages.length > 0) {
      socket.emit("conversation:mark_seen", {
        senderId: currentUser.id,
        conversationId: selectedConversation.data.id,
        type: selectedConversation.type,
      });
    }
  }, [selectedConversation, socket, messages.length, currentUser]);

  useEffect(() => {
    if (!socket) return;
    const context = {
      selectedConversationRef,
      currentUserRef,
      messagesEndRef,
      setTypingUsers,
      setMessages,
    };
    const onStopTyping = (data: { conversationId: string; name?: string }) =>
      handleUserStoppedTyping(data, context);
    const onTyping = (data: TypingUser) => handleUserTyping(data, context);
    const onMessage = (msg: MessageType) => handleIncomingMessage(msg, context);
    const onConversationSeen = (data: any) =>
      handleConversationSeen(data, context);

    socket.on("user:typing", onTyping);
    socket.on("user:stopped-typing", onStopTyping);
    socket.on("group:message", onMessage);
    socket.on("dm:message", onMessage);
    socket.on("conversation:seen", onConversationSeen);

    return () => {
      socket.off("user:typing", onTyping);
      socket.off("user:stopped-typing", onStopTyping);
      socket.off("group:message", onMessage);
      socket.off("dm:message", onMessage);
      socket.off("conversation:seen", onConversationSeen);
    };
  }, [socket, setMessages]);

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
    const tempMessageBase = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      senderId: currentUser.id,
      sender: tempSender,
      isOptimistic: true,
      isRead: false,
      reactions: [],
    };

    let tempMessage: MessageType;
    let eventName = "";
    let payload = {};

    if (selectedConversation.type === "room") {
      eventName = "group:send";
      payload = {
        senderId: currentUser.id,
        roomId: selectedConversation.data.id,
        content,
        tempId,
      };
      tempMessage = {
        ...tempMessageBase,
        roomId: selectedConversation.data.id,
      } as GroupMessage;
    } else {
      eventName = "dm:send";
      payload = {
        senderId: currentUser.id,
        recipientId: selectedConversation.data.id,
        content,
        tempId,
      };
      tempMessage = {
        ...tempMessageBase,
        recipientId: selectedConversation.data.id,
      } as DirectMessage;
    }

    setMessages((prev) => [...prev, tempMessage]);
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
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      socket.emit("message:delete", {
        userId: currentUser.id,
        messageId: messageId as string,
        messageType,
      });
    } catch (err) {
      setError(`failed : ${err}`);
    }
  };

  if (!selectedConversation) return null;
  if (isLoadingMessages && messages.length === 0) return <ChatPanelSkeleton />;

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
                onToggleReaction={() => {}}
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
// }}}
