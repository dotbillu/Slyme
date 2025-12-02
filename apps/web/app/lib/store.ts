import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  User,
  Following,
  SelectedConversation,
  ChatMapRoom,
  SimpleUser,
  MessageType,
} from "@/lib/types";
import { Socket } from "socket.io-client";
export type PageName =
  | "Home"
  | "Map"
  | "Search"
  | "Network"
  | "Activity"
  | "profile";
export const CurrentPageAtom = atom<PageName>("Home");

interface LocationState {
  lat: number | null;
  lng: number | null;
}

export const locationAtom = atom<LocationState>({ lat: null, lng: null });

export const userAtom = atomWithStorage<User | null>("user", null);

export const followingListAtom = atomWithStorage<Following[]>(
  "followingList",
  [],
);

export const toggleFollowAtom = atom(null, (get, set, username: string) => {
  const user = get(userAtom);
  if (!user) return;

  const currentList = get(followingListAtom);
  const isFollowing = currentList.some((u) => u.username === username);

  if (isFollowing) {
    set(
      followingListAtom,
      currentList.filter((u) => u.username !== username),
    );
  } else {
    set(followingListAtom, [
      ...currentList,
      {
        id:
          typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : Date.now().toString(),
        username: username,
        name: username,
        image: null,
        lastMessage: null,
        lastMessageTimestamp: null,
      },
    ]);
  }
});

export const likePostAtom = atom(null, (get) => {
  const user = get(userAtom);
  if (!user) return;
});

export const networkLoadingAtom = atom(
  (get) => ({
    profile: get(profileLoadingAtom),
    messages: get(messagesLoadingAtom),
  }),
  (get, set, update: { key: "profile" | "messages"; value: boolean }) => {
    if (update.key === "profile") {
      set(profileLoadingAtom, update.value);
    } else {
      set(messagesLoadingAtom, update.value);
    }
  },
);

export const networkErrorAtom = atom<string | null>(null);
export const isNewChatModalOpenAtom = atom<boolean>(false);

export type NetworkFilter = "all" | "rooms" | "dms";
export const networkFilterAtom = atom<NetworkFilter>("all");

export const sidebarTransitionLoadingAtom = atom(false);

export const selectedConversationAtom = atom<SelectedConversation>(null);
export const userRoomsAtom = atom<ChatMapRoom[]>([]);
export const dmConversationsAtom = atom<SimpleUser[]>([]);
export const messagesAtom = atom<MessageType[]>([]);

export const totalUnseenConversationsAtom = atom((get) => {
  const rooms = get(userRoomsAtom);
  const dms = get(dmConversationsAtom);
  const unseenRooms = rooms.filter((r) => (r.unseenCount || 0) > 0).length;
  const unseenDms = dms.filter((d) => (d.unseenCount || 0) > 0).length;

  return unseenRooms + unseenDms;
});

const profileLoadingAtom = atom<boolean>(true);
const messagesLoadingAtom = atom<boolean>(false);


export const socketAtom = atom<Socket | null>(null);

