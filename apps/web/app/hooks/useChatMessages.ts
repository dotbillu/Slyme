"use client";

import { useCallback } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { MessageType, SelectedConversation } from '@lib/types';
import { API_BASE_URL } from '@lib/constants';
import { useAtom } from 'jotai';
import { userAtom } from '@store';

const MESSAGES_PER_PAGE = 30;

const fetchMessages = async ({ pageParam = 0, queryKey }: any) => {
  const [_key, conversation] = queryKey;
  const { type, id, currentUserId } = conversation;

  let url = "";
  
  if (type === "room") {
    url = `${API_BASE_URL}/chat/room/${id}/messages?skip=${pageParam}&take=${MESSAGES_PER_PAGE}`;
  } else {
    url = `${API_BASE_URL}/chat/dm/${id}?currentUserId=${currentUserId}&skip=${pageParam}&take=${MESSAGES_PER_PAGE}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }

  const messages: MessageType[] = await res.json();
  return messages;
};

export const useChatMessages = (conversation: SelectedConversation) => {
  const [currentUser] = useAtom(userAtom);

  const selectMessages = useCallback((data: InfiniteData<MessageType[]>) => {
    return data.pages.flat(); 
  }, []);

  const queryKey = conversation && currentUser
    ? ['chat', { type: conversation.type, id: conversation.data.id, currentUserId: currentUser.id }]
    : ['chat', 'idle'];

  return useInfiniteQuery({
    queryKey: queryKey,
    queryFn: fetchMessages,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < MESSAGES_PER_PAGE) {
        return undefined;
      }
      return allPages.flat().length;
    },
    enabled: !!conversation && !!currentUser,
    staleTime: 0,
    // FIX: Removed placeholderData. 
    // This forces the UI to clear the old chat and show "Loading..." immediately upon switch.
    select: selectMessages, 
  });
};
