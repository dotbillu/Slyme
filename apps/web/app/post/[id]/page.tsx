"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  MapPin,
  ArrowLeft,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAtom } from "jotai";
import { userAtom } from "@store";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { getImageUrl } from "@lib/utils";
import { API_BASE_URL } from "@/lib/constants";
import { Post, SimpleUser } from "@/lib/types";

type PostComment = {
  id: string | number;
  content: string;
  createdAt: string;
  user: SimpleUser;
};

type PostDetail = Post & {
  comments: PostComment[];
  user: SimpleUser;
};

const PostImageGrid = ({
  imageUrls,
  openModal,
}: {
  imageUrls: string[];
  openModal: (e: React.MouseEvent, index: number) => void;
}) => {
  const count = imageUrls.length;
  if (count === 0) return null;

  const gridBase =
    "relative w-full max-w-xl h-80 rounded-2xl overflow-hidden mt-3 border border-gray-700";

  if (count === 1) {
    return (
      <div
        className={`${gridBase} cursor-pointer`}
        onClick={(e) => openModal(e, 0)}
      >
        <Image
          src={getImageUrl(imageUrls[0])}
          alt="Post image"
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className={`${gridBase} grid grid-cols-2 gap-0.5`}>
        {imageUrls.map((url, index) => (
          <div
            key={index}
            className="relative h-full cursor-pointer"
            onClick={(e) => openModal(e, index)}
          >
            <Image
              src={getImageUrl(url)}
              alt={`Post image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    );
  }
  if (count === 3) {
    return (
      <div className={`${gridBase} grid grid-cols-2 grid-rows-2 gap-0.5`}>
        <div
          className="relative row-span-2 cursor-pointer"
          onClick={(e) => openModal(e, 0)}
        >
          <Image
            src={getImageUrl(imageUrls[0])}
            alt="Post image 1"
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div
          className="relative col-start-2 cursor-pointer"
          onClick={(e) => openModal(e, 1)}
        >
          <Image
            src={getImageUrl(imageUrls[1])}
            alt="Post image 2"
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div
          className="relative col-start-2 row-start-2 cursor-pointer"
          onClick={(e) => openModal(e, 2)}
        >
          <Image
            src={getImageUrl(imageUrls[2])}
            alt="Post image 3"
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className={`${gridBase} grid grid-cols-2 grid-rows-2 gap-0.5`}>
      {imageUrls.slice(0, 4).map((url, index) => (
        <div
          key={index}
          className="relative h-full cursor-pointer"
          onClick={(e) => openModal(e, index)}
        >
          <Image
            src={getImageUrl(url)}
            alt={`Post image ${index + 1}`}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            style={{ objectFit: "cover" }}
          />
          {count > 4 && index === 3 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
              +{count - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function PostDetailPage() {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const router = useRouter();
  const params = useParams();
  const { id: postId } = params;

  const [user] = useAtom(userAtom);
  const currentUserId = user?.id;
  const currentUserImage = user?.image;
  const currentUserStatus = user ? "authenticated" : "unauthenticated";

  const likeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!postId) return;
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/feed/posts/${postId}`);
        if (!res.ok) throw new Error("Post not found");
        const data: PostDetail = await res.json();
        setPost(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const openModal = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setModalImageIndex(index);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsModalOpen(false);
  }, []);

  const showNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post) return;
    setModalImageIndex((prev) =>
      prev < post.imageUrls.length - 1 ? prev + 1 : 0,
    );
  };

  const showPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post) return;
    setModalImageIndex((prev) =>
      prev > 0 ? prev - 1 : post.imageUrls.length - 1,
    );
  };

  const handleLikeToggle = () => {
    if (!currentUserId || !post) return;

    const isLiked = post.likes.some((like) => like.userId === currentUserId);

    setPost((prevPost) => {
      if (!prevPost) return null;
      if (isLiked) {
        return {
          ...prevPost,
          likes: prevPost.likes.filter((like) => like.userId !== currentUserId),
          _count: { ...prevPost._count, likes: prevPost._count.likes - 1 },
        };
      } else {
        return {
          ...prevPost,
          likes: [...prevPost.likes, { userId: currentUserId }],
          _count: { ...prevPost._count, likes: prevPost._count.likes + 1 },
        };
      }
    });

    if (likeDebounceTimer.current) {
      clearTimeout(likeDebounceTimer.current);
    }

    likeDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/posts/${post.id}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId }),
        });
        if (!res.ok) throw new Error("API call failed");
      } catch (err) {
        console.error("Failed to toggle like (server):", err);
      }
    }, 1000);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !post || !comment.trim()) return;

    setIsSubmitting(true);

    const optimisticUser: SimpleUser = {
      id: currentUserId,
      username: user?.username || "current_user",
      name: user?.name || user?.username || "You",
      image: currentUserImage || null,
      lastMessage: null,
      lastMessageTimestamp: null,
    };

    const newCommentTemp: PostComment = {
      id: Date.now(),
      content: comment,
      createdAt: new Date().toISOString(),
      user: optimisticUser,
    };

    setPost((prevPost) => {
      if (!prevPost) return null;
      return {
        ...prevPost,
        comments: [newCommentTemp, ...prevPost.comments],
        _count: {
          ...prevPost._count,
          comments: prevPost._count.comments + 1,
        },
      };
    });
    setComment("");

    try {
      const res = await fetch(`${API_BASE_URL}/feed/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          content: newCommentTemp.content,
        }),
      });
      if (!res.ok) throw new Error("Failed to post comment");

      const finalComment: PostComment = await res.json();

      setPost((prevPost) => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          comments: prevPost.comments.map((c) =>
            c.id === newCommentTemp.id ? finalComment : c,
          ),
        };
      });
    } catch (err) {
      console.error("Failed to post comment:", err);
      setPost((prevPost) => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          comments: prevPost.comments.filter((c) => c.id !== newCommentTemp.id),
          _count: {
            ...prevPost._count,
            comments: prevPost._count.comments - 1,
          },
        };
      });
      setComment(newCommentTemp.content);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto border-l border-r border-gray-700 min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full max-w-2xl mx-auto border-l border-r border-gray-700 min-h-screen bg-black">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 flex items-center gap-4 p-4 border-b border-gray-700">
          <button
            onClick={() => router.back()}
            className="text-white p-2 rounded-full hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">Post not found</h1>
        </div>
      </div>
    );
  }

  const isLikedByCurrentUserFinal = post.likes.some(
    (like) => like.userId === currentUserId,
  );

  return (
    <div className="w-full max-w-2xl mx-auto border-l border-r border-gray-700 min-h-screen bg-black">
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 flex items-center gap-4 p-4 border-b border-gray-700">
        <button
          onClick={() => router.back()}
          className="text-white p-2 rounded-full hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Post</h1>
      </div>

      <div className="flex space-x-3 p-4 border-b border-gray-700">
        <div className="shrink-0">
          <Link href={`/profile/${post.username}`}>
            {post.user?.image ? (
              <Image
                src={getImageUrl(post.user.image)}
                alt={post.username}
                width={40}
                height={40}
                className="rounded-full object-cover w-10 h-10"
              />
            ) : (
              <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10 flex items-center justify-center bg-gray-600">
                {post.username[0].toUpperCase()}
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.username}`}>
              <p className="text-white font-bold hover:underline">
                {post.name || post.username}
              </p>
            </Link>
            <Link href={`/profile/${post.username}`}>
              <p className="text-gray-400 hover:underline">@{post.username}</p>
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(post.createdAt).toLocaleString()}
          </p>

          <p className="text-white mt-4 whitespace-pre-wrap wrap-break-words text-lg">
            {post.content}
          </p>

          {post.location && (
            <p className="text-gray-400 text-sm flex items-center gap-1 mt-2">
              <MapPin size={16} />
              {post.location}
            </p>
          )}

          <PostImageGrid imageUrls={post.imageUrls} openModal={openModal} />

          <div className="flex items-center gap-6 mt-4 text-zinc-500">
            <button
              onClick={handleLikeToggle}
              disabled={currentUserStatus !== "authenticated"}
              className={`flex items-center gap-1.5 transition-colors duration-200 group ${
                isLikedByCurrentUserFinal
                  ? "text-red-500"
                  : "hover:text-red-500"
              } ${currentUserStatus !== "authenticated" ? "opacity-50" : ""}`}
            >
              <Heart
                size={18}
                fill={isLikedByCurrentUserFinal ? "currentColor" : "none"}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="text-sm">{post._count.likes}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <MessageCircle size={18} />
              <span className="text-sm">{post._count.comments}</span>
            </div>
          </div>
        </div>
      </div>

      {currentUserStatus === "authenticated" && (
        <form
          onSubmit={handleCommentSubmit}
          className="flex gap-3 p-4 border-b bg-black border-gray-700"
        >
          <div className="shrink-0 mt-2">
            {currentUserImage ? (
              <Image
                src={getImageUrl(currentUserImage)}
                alt={user?.username || "user"}
                width={40}
                height={40}
                className="rounded-full object-cover w-10 h-10"
              />
            ) : (
              <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10 flex items-center justify-center bg-gray-600">
                {user?.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Post your reply"
            className="textarea textarea-bordered w-full bg-zinc-900 text-white placeholder-zinc-500  p-2 rounded-lg  resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
            rows={2}
          />
          <button
            type="submit"
            className={`
    flex items-center justify-center h-fit mt-2 px-4 py-2
    text-black font-semibold rounded-full transition-colors

    ${
      isSubmitting || !comment.trim()
        ? "opacity-50 bg-zinc-500 cursor-not-allowed"
        : "bg-white hover:bg-white/80 cursor-pointer"
    }
  `}
            disabled={isSubmitting || !comment.trim()}
          >
            Reply
          </button>
        </form>
      )}

      {/* Comments */}
      <div className="pb-24">
        {post.comments.map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex space-x-3 p-4 border-b border-gray-700"
          >
            <div className="shrink-0">
              <Link href={`/profile/${comment.user.username}`}>
                {comment.user.image ? (
                  <Image
                    src={getImageUrl(comment.user.image)}
                    alt={comment.user.username}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-10 h-10"
                  />
                ) : (
                  <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10 flex items-center justify-center bg-gray-600">
                    {comment.user.username[0].toUpperCase()}
                  </div>
                )}
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${comment.user.username}`}>
                  <p className="text-white font-bold hover:underline">
                    {comment.user.name || comment.user.username}
                  </p>
                </Link>
                <Link href={`/profile/${comment.user.username}`}>
                  <p className="text-gray-400 hover:underline">
                    @{comment.user.username}
                  </p>
                </Link>
                <p className="text-gray-500 text-sm">
                  · {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-white mt-1 whitespace-pre-wrap wrap-break-words">
                {comment.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && post.imageUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={closeModal}
          >
            <button
              className="absolute top-4 right-4 text-white z-60 p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors"
              onClick={closeModal}
            >
              <X size={32} />
            </button>
            {post.imageUrls.length > 1 && (
              <button
                className="absolute left-4 p-2 bg-black/50 rounded-full text-white z-[60] hover:bg-black/80 transition-colors"
                onClick={showPrevImage}
              >
                <ChevronLeft size={32} />
              </button>
            )}
            <div
              className="relative w-[90vw] h-[90vh]"
              onClick={stopPropagation}
            >
              <Image
                src={getImageUrl(post.imageUrls[modalImageIndex])}
                alt="Post image expanded"
                fill
                sizes="90vw"
                className="object-contain"
                priority
              />
              {post.imageUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                  {modalImageIndex + 1} / {post.imageUrls.length}
                </div>
              )}
            </div>
            {post.imageUrls.length > 1 && (
              <button
                className="absolute right-4 p-2 bg-black/50 rounded-full text-white z-60 hover:bg-black/80 transition-colors"
                onClick={showNextImage}
              >
                <ChevronRight size={32} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
