"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSetAtom } from "jotai";
import { Search, Pencil, X } from "lucide-react";
import { isNewChatModalOpenAtom } from "@store";

interface SidebarSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function SidebarSearchBar({ searchTerm, setSearchTerm }: SidebarSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const setIsModalOpen = useSetAtom(isNewChatModalOpenAtom);
  const searchBarRef = useRef<HTMLDivElement>(null);

  const isExpanded = isFocused || searchTerm.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0">
      <div className="flex-grow" ref={searchBarRef}>
        <div className={`relative flex items-center rounded-full transition-all duration-200 ${isExpanded ? "bg-zinc-800" : "bg-zinc-900"}`}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-9 pr-8 py-2 rounded-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
          {isExpanded && (
            <button onClick={() => { setSearchTerm(""); setIsFocused(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-700">
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          )}
        </div>
      </div>
      <button onClick={() => setIsModalOpen(true)} className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0">
        <Pencil size={20} />
      </button>
    </div>
  );
}
