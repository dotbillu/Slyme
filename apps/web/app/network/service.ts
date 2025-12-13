import { 
  User, 
  MessageType, 
  TypingUser, 
  SelectedConversation, 
  SimpleUser
} from "@/lib/types";
import { Dispatch, SetStateAction, RefObject } from "react";

interface SocketHandlerContext {
  selectedConversationRef: RefObject<SelectedConversation>; 
  currentUserRef: RefObject<User | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  setTypingUsers: Dispatch<SetStateAction<TypingUser[]>>;
  setMessages: Dispatch<SetStateAction<MessageType[]>>;
}

// formatlastseen{{{
export const formatLastSeen = (lastSeen: string | null | undefined): string => {
  if (!lastSeen) return "";

  const date = new Date(lastSeen);
  if (isNaN(date.getTime())) return "";

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
};
// }}}

// formatdate{{{
export const formatDate = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

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
//}}}

// toSimpleUser{{{
export const toSimpleUser = (user: User): SimpleUser => ({
  id: user.id,
  username: user.username,
  name: user.name,
  image: user.image || null,
  isOnline: true,
  lastMessage: null,
  lastMessageTimestamp: null,
});
// }}}

// handleUserTyping {{{
export const handleUserTyping = (
  data: TypingUser,
  {
    selectedConversationRef,
    setTypingUsers,
  }: Pick<SocketHandlerContext, "selectedConversationRef" | "setTypingUsers">,
) => {
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
// }}}

// handleuserstoptyping {{{
export const handleUserStoppedTyping = (
  data: { conversationId: string; name?: string },
  {
    selectedConversationRef,
    setTypingUsers,
  }: Pick<SocketHandlerContext, "selectedConversationRef" | "setTypingUsers">,
) => {
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
// }}}

// handleincomingmessages {{{
export const handleIncomingMessage = (
  msg: MessageType,
  {
    selectedConversationRef,
    currentUserRef,
    setTypingUsers,
    setMessages,
    messagesEndRef,
  }: SocketHandlerContext,
) => {
  const currentConvo = selectedConversationRef.current;
  const currentUser = currentUserRef.current;
  
  if (!currentConvo || !currentUser) return;

  setTypingUsers((prev) => prev.filter((u) => u.name !== msg.sender?.name));

  let isForCurrentConvo = false;
  if (currentConvo.type === "room") {
    // Both GroupMessage and DirectMessage might exist here, but we check IDs
    // We cast msg.roomId to string to be safe, though MessageType defines it
    if (String((msg as any).roomId) === String(currentConvo.data.id))
      isForCurrentConvo = true;
  } else if (currentConvo.type === "dm") {
    const msgSender = String(msg.senderId);
    // DirectMessage has recipientId
    const msgRecipient = String((msg as any).recipientId);
    const currentId = String(currentUser.id);
    const convoId = String(currentConvo.data.id);

    if (
      (msgSender === convoId && msgRecipient === currentId) ||
      (msgSender === currentId && msgRecipient === convoId)
    ) {
      isForCurrentConvo = true;
    }
  }

  if (isForCurrentConvo) {
    setMessages((prev) => [...prev, msg]);
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }
};
// }}}

// handleConversationSeen {{{
export const handleConversationSeen = (
    data: { viewerId: string, time: string },
    {
       setMessages,
       currentUserRef
    }: Pick<SocketHandlerContext, "setMessages" | "currentUserRef">
) => {
    const currentUser = currentUserRef.current;
    if (!currentUser) return;

    // Mark all messages sent by ME as read
    setMessages(prev => prev.map(msg => {
        if (msg.senderId === currentUser.id && !msg.isRead) {
            return { ...msg, isRead: true };
        }
        return msg;
    }));
}
// }}}
