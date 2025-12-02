"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Image as LucideImage, MapPin, X } from "lucide-react";
import { useAtom } from "jotai";
import { userAtom, locationAtom } from "@store";
import { API_BASE_URL } from "@/lib/constants";
import { Post } from "@/lib/types";

interface CreatePostProps {
  onPostCreated: (newPost: Post) => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState("");

  const [user] = useAtom(userAtom);
  const [coords, setCoords] = useAtom(locationAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!user)
    return (
      <p className="p-4 text-center text-gray-400 border-b border-gray-700">
        Please login to post
      </p>
    );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      setError("You can upload max 5 images.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    setError("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("Permission denied or failed to get location"),
    );
  };

  const getCityFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();
      return (
        data.address?.city || data.address?.town || data.address?.village || ""
      );
    } catch {
      return "";
    }
  };

  const handleLocationToggle = async () => {
    const toggle = !includeLocation;
    setIncludeLocation(toggle);

    if (toggle && (!coords.lat || !coords.lng)) {
      await requestLocation();
    }

    if (toggle && coords.lat && coords.lng) {
      const city = await getCityFromCoords(coords.lat, coords.lng);
      setLocationName(city);
    } else {
      setLocationName("");
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length > 5000) return;
    setContent(e.target.value);
    setError("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 250)}px`;
      el.style.overflowY = el.scrollHeight > 250 ? "auto" : "hidden";
    }
  };

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) {
      setError("Write something or add at least one image!");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("username", user.username);
    formData.append("name", user.name);
    formData.append("content", content);
    if (includeLocation && locationName)
      formData.append("location", locationName);
    images.forEach((img) => formData.append("images", img));

    try {
      const res = await fetch(`${API_BASE_URL}/feed/uploadPosts`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());

      const newPost: Post = await res.json();

      setContent("");
      setImages([]);
      setPreviews([]);
      setIncludeLocation(false);
      setLocationName("");

      if (onPostCreated) {
        onPostCreated(newPost);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 border-b border-gray-700 space-y-3"
    >
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-3">
        <div className="shrink-0">
          {user.image ? (
            <Image
              src={
                user.image.startsWith("http")
                  ? user.image
                  : `${API_BASE_URL}/uploads/${user.image}`
              }
              alt={user.name}
              width={48}
              height={48}
              className="rounded-full object-cover w-12 h-12"
            />
          ) : (
            <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12 flex items-center justify-center">
              <span>{user.name[0].toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            placeholder="What’s happening?"
            className="w-full bg-transparent border-none resize-none focus:outline-none text-white placeholder-gray-500 text-xl overflow-hidden"
            rows={1}
          />
          <div className="flex flex-wrap gap-3 mt-3">
            {previews.map((src, index) => (
              <div
                key={index}
                className="relative w-32 h-32 rounded-2xl overflow-hidden border border-gray-700"
              >
                <Image
                  src={src}
                  alt={`preview-${index}`}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black/80 transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-gray-400 text-sm">{content.length}/5000</span>
            <div className="flex gap-4 items-center relative text-white-500">
              <label className="cursor-pointer hover:text-white-400">
                <LucideImage className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
              <button
                onClick={handleLocationToggle}
                className={`flex items-center gap-1 text-sm cursor-pointer ${
                  includeLocation
                    ? "text-blue-500 hover:text-white-400"
                    : "hover:text-white-400"
                }`}
              >
                <MapPin className="w-5 h-5" />
              </button>
              <button
                onClick={handlePost}
                disabled={loading || (!content.trim() && images.length === 0)}
                className="btn btn-sm rounded-full bg-white-500 text-white font-bold px-5 py-2 border-none hover:bg-white-600 transition disabled:opacity-50 disabled:bg-white-800"
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
