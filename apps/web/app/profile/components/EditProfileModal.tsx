"use client";

import { useState, useRef } from "react";
import { X, Camera } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { API_BASE_URL } from "@lib/constants";
import { UserProfile } from "@/lib/types";

const getImageUrl = (path: string | null | undefined) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}/uploads/${path}`;
};

interface ImageUploadFieldProps {
  previewUrl: string;
  onTriggerClick: () => void;
  containerClassName: string;
  imageClassName?: string;
  overlayClassName?: string;
  alt: string;
}

function ImageUploadField({
  previewUrl,
  onTriggerClick,
  containerClassName,
  imageClassName = "",
  overlayClassName = "",
  alt,
}: ImageUploadFieldProps) {
  return (
    <div className={containerClassName}>
      {previewUrl && (
        <Image
          src={previewUrl}
          alt={alt}
          fill
          style={{ objectFit: "cover" }}
          className={imageClassName}
        />
      )}
      <div
        onClick={onTriggerClick}
        className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer ${overlayClassName}`}
      >
        <Camera size={24} />
      </div>
    </div>
  );
}

interface HiddenFileInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function HiddenFileInput({ inputRef, onChange }: HiddenFileInputProps) {
  return (
    <input
      type="file"
      accept="image/*"
      ref={inputRef as React.RefObject<HTMLInputElement>}
      onChange={onChange}
      className="hidden"
    />
  );
}

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export default function EditProfileModal({
  profile,
  onClose,
  onUpdate,
}: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [files, setFiles] = useState<{
    image: File | null;
    poster: File | null;
  }>({
    image: null,
    poster: null,
  });

  const [previews, setPreviews] = useState({
    image: getImageUrl(profile.image),
    poster: getImageUrl(profile.posterImage),
  });

  const inputRefs = {
    image: useRef<HTMLInputElement>(null),
    poster: useRef<HTMLInputElement>(null),
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "poster"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFiles((prev) => ({ ...prev, [type]: file }));
      setPreviews((prev) => ({ ...prev, [type]: previewUrl }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);

    if (files.image) {
      formData.append("image", files.image);
    }
    if (files.poster) {
      formData.append("posterImage", files.poster);
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/user/profile/${profile.username}`,
        {
          method: "PATCH",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update profile.");
      }

      const updatedProfile: UserProfile = await res.json();
      onUpdate(updatedProfile);
    } catch (err) {
      console.error(err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-black border border-zinc-700 text-white"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold">Edit profile</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-bold disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <ImageUploadField
            previewUrl={previews.poster}
            onTriggerClick={() => inputRefs.poster.current?.click()}
            containerClassName="relative h-48 bg-zinc-800"
            alt="Poster preview"
          />

          <div className="p-4 -mt-16">
            <ImageUploadField
              previewUrl={previews.image}
              onTriggerClick={() => inputRefs.image.current?.click()}
              containerClassName="relative w-28 h-28 rounded-full border-4 border-black bg-zinc-700"
              imageClassName="rounded-full"
              overlayClassName="rounded-full"
              alt="Profile preview"
            />
          </div>

          <HiddenFileInput
            inputRef={inputRefs.image}
            onChange={(e) => handleFileChange(e, "image")}
          />
          <HiddenFileInput
            inputRef={inputRefs.poster}
            onChange={(e) => handleFileChange(e, "poster")}
          />

          <div className="p-4 pt-0 space-y-2">
            <label htmlFor="name" className="text-sm text-zinc-400">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg bg-transparent border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="p-4 pt-0 text-sm text-red-500">{error}</p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
