"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import { selectedConversationAtom, socketAtom, userAtom } from "@store";
import { ChatInputProps } from "@/lib/types";

const INITIAL_WIDTH = 1000;

const TEXTAREA_CLASS = `
  bg-transparent border-none resize-none 
  text-white placeholder:text-gray-500 focus:outline-none focus:ring-0
  max-h-60 overflow-y-auto px-2 py-2
  [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
`;

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onGetSendButtonPosition,
}) => {
  const [content, setContent] = useState("");
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const [dynamicWidth] = useState(INITIAL_WIDTH);

  const [socket] = useAtom(socketAtom);
  const [currentUser] = useAtom(userAtom);
  const [selectedConversation] = useAtom(selectedConversationAtom);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const isEnabled = content.trim() !== "";

  const emitStopTyping = () => {
    if (!socket || !selectedConversation) return;
    socket.emit("typing:stop", {
      conversationId: selectedConversation.data.id,
      isGroup: selectedConversation.type === "room",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnabled) return;

    if (sendButtonRef.current) {
      onGetSendButtonPosition(sendButtonRef.current);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    emitStopTyping();
    onSend(content);
    setContent("");
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    if (!socket || !selectedConversation || !currentUser) return;

    if (!typingTimeoutRef.current) {
      socket.emit("typing:start", {
        conversationId: selectedConversation.data.id,
        isGroup: selectedConversation.type === "room",
        senderName: currentUser.name || currentUser.username,
      });
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji);
    // Small delay ensures focus returns after state update
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // Auto-height for textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Close emoji picker on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="p-4 relative">
      {isEmojiPickerOpen && (
        <div className="absolute bottom-full left-1/4 m-10 -translate-x-1/2 mb-2">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.DARK}
            lazyLoadEmojis={true}
            height={400}
            width={350}
          />
        </div>
      )}

      <div className="flex justify-center">
        <motion.div
          layout
          animate={{ width: dynamicWidth }}
          transition={{ type: "spring", stiffness: 500, damping: 100 }}
          className="flex items-end gap-2 bg-zinc-900 rounded-4xl p-1"
        >
          <button
            type="button"
            className="shrink-0 w-10 h-10 mb-0.5 rounded-full text-gray-400 hover:text-gray-200 flex items-center justify-center transition-colors"
            onClick={() => setEmojiPickerOpen((prev) => !prev)}
          >
            <Smile size={20} />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Start typing..."
            className={`grow mb-1 w-full ${TEXTAREA_CLASS}`}
          />

          <AnimatePresence>
            {isEnabled && (
              <motion.button
                ref={sendButtonRef}
                layout
                initial={{ opacity: 0, scale: 0.7, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "2.5rem" }}
                exit={{ opacity: 0, scale: 0.7, width: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                type="submit"
                className="shrink-0 w-10 h-10 mr-0.5 rounded-full flex items-center justify-center transition-colors duration-200 ease-out bg-indigo-600 hover:bg-indigo-700 text-white mb-0.5"
              >
                <SendHorizontal size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </form>
  );
};

export default ChatInput;
