export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  image?: string | null;
  createdAt: string;
  publicKey?: string;
}

export interface E2EEKeys {
  privateKey: string;
  publicKey: string;
}
export interface Following {
  id: string;
  username: string;
  name: string;
  image: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  isOnline?: boolean;
  unseenCount?: number;
}

export interface Post {
  id: string;
  username: string;
  name?: string;
  content: string;
  createdAt: string;
  imageUrls: string[];
  location?: string;
  user?: { image?: string; id?: string };
  likes: { userId: string }[];
  _count: {
    likes: number;
    comments: number;
  };
}

export interface Gig {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  date: string | null;
  imageUrls: string[];
  type: string | null;
}

export interface MapRoom {
  id: string;
  name: string;
  createdAt: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  type: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
  posterImage: string | null;
  createdAt: string;
  posts: Post[];
  gigs: Gig[];
  rooms: MapRoom[];
  mapRooms: MapRoom[];
  followers: Following[];
  following: Following[];
}

export interface SimpleUser {
  id: string;
  username: string;
  name: string;
  image: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  unseenCount?: number;
}

export interface ChatMapRoom {
  id: string;
  name: string;
  imageUrl: string | null;
  description?: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: string | null;
  unseenCount?: number;
  isOnline?: boolean;
  lastSeen?: string | null;
  type?: string | null;
}

export interface ChatUserProfile extends Omit<
  UserProfile,
  | "email"
  | "posterImage"
  | "createdAt"
  | "posts"
  | "gigs"
  | "rooms"
  | "followers"
> {
  rooms: ChatMapRoom[];
  following: SimpleUser[];
}

export interface Reaction {
  id: string;
  emoji: string;
  user: SimpleUser;
}

export interface MessageBase {
  id: string | number;
  content: string;
  createdAt: string;
  senderId: string;
  sender: SimpleUser;
  reactions: Reaction[];
  isOptimistic?: boolean;
  isRead?: boolean;
}

export interface DirectMessage extends MessageBase {
  recipientId: string;
  roomId?: never;
}

export interface GroupMessage extends MessageBase {
  roomId: string;
  recipientId?: never;
}

export type MessageType = GroupMessage | DirectMessage;

export type SelectedConversation =
  | { type: "room"; data: ChatMapRoom }
  | { type: "dm"; data: SimpleUser }
  | null;

export interface TypingUser {
  conversationId: string;
  name: string;
}

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  image: string | null;
  posterImage?: string | null;
}

export interface SearchPost {
  id: string;
  content: string;
  user: { username: string };
}

export interface SearchGig {
  id: string;
  title: string;
  description?: string | null;
  createdBy: { username: string };
  imageUrls: string[];
}

export interface SearchRoom {
  id: string;
  name: string;
  description?: string | null;
  createdBy: { username: string };
  imageUrl: string | null;
}

export type SearchResult =
  | { type: "user"; data: SearchUser }
  | { type: "post"; data: SearchPost }
  | { type: "gig"; data: SearchGig }
  | { type: "room"; data: SearchRoom };

export interface FilterState {
  posts: boolean;
  gigs: boolean;
  rooms: boolean;
}

export interface ActivityItemPost {
  type: "post";
  data: Post;
}

export interface ActivityItemGig {
  type: "gig";
  data: Gig & {
    description: string;
    createdBy: UserProfile;
    createdAt: string;
    reward: string;
    imageUrls: string[];
  };
}

export interface ActivityItemRoom {
  type: "room";
  data: MapRoom & {
    name: string;
    description: string;
    createdBy: UserProfile;
    createdAt: string;
    imageUrl?: string;
    type?: string;
  };
}

export type ActivityItem =
  | ActivityItemPost
  | ActivityItemGig
  | ActivityItemRoom;

export interface FeedPage {
  items: ActivityItem[];
  hasNextPage: boolean;
}

export interface ChatInputProps {
  onSend: (content: string) => void;
  onGetSendButtonPosition: (buttonElement: HTMLButtonElement) => void;
}

export interface MessageBubbleProps {
  message: MessageType;
  isMe: boolean;
  isGroup: boolean;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  spacing: "small" | "large";
}

export interface MessageListProps {
  messages: MessageType[];
  currentUser: SimpleUser;
  selectedConversation: NonNullable<SelectedConversation>;
  onDelete: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}
export type Conversation = (ChatMapRoom | SimpleUser) & { type: "room" | "dm" };

export interface ConversationItemProps {
  item: Conversation | ChatMapRoom | SimpleUser;
  type: "room" | "dm";
  isSelected: boolean;
  onClick: () => void;
}

export interface ConversationListProps {
  items: Conversation[];
  searchTerm: string;
}

export interface ChatPanelProps {
  isMobile?: boolean;
  onBack?: () => void;
}

export interface PostEntryProps {
  post: Post;
  currentUserId: string;
  onLikeToggle: (postId: string) => void;
  onNavigate: (postId: string) => void;
  onPrefetchProfile: (username: string) => void;
  onPrefetchPost: (postId: string) => void;
  loggedInUser?: UserProfile;
  followingList?: Following[];
  onFollowToggle?: (username: string) => void;
}
