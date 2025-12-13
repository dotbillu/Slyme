"use client";

import React from 'react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  activeEmoji?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, activeEmoji }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-full border border-gray-200 dark:border-gray-600 p-1 flex gap-1 items-center">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className={`relative text-lg p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all leading-none ${
            activeEmoji === emoji ? "bg-indigo-50 dark:bg-indigo-900/30" : ""
          }`}
        >
          {emoji}
          {activeEmoji === emoji && (
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
