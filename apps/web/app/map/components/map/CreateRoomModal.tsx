"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { userAtom } from "@store";
import { MapElement } from "./MapTypes";
import { Loader2, X, Upload } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

type CreateRoomModalProps = {
  location: { lat: number; lng: number };
  onClose: () => void;
  onSuccess: (newRoom: MapElement) => void;
};

export default function CreateRoomModal({
  location,
  onClose,
  onSuccess,
}: CreateRoomModalProps) {
  const [user] = useAtom(userAtom);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("SOCIAL");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const allFilled = name.trim() && description.trim() && type.trim();

  const handleImage = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImage(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError("You must be logged in to create a room.");
    if (!allFilled) return setError("Please fill in all fields.");

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("creatorId", user.id);
    formData.append("type", type);
    if (image) formData.append("image", image);

    try {
      const res = await fetch(`${API_BASE_URL}/map/room`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create room");
      }

      const { room: newRoom } = await res.json();
      onSuccess(newRoom);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg border border-zinc-800 bg-black shadow-2xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Create a New Room
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-grow flex flex-col md:flex-row overflow-hidden"
          >
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Room Name"
                  value={name}
                  onChange={(e: any) => setName(e.target.value)}
                />
                <SelectField
                  label="Type"
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  options={["SOCIAL", "GIG RELATED"]}
                />
              </div>
              <TextAreaField
                label="Description"
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
              />
            </div>

            <div className="w-full md:w-56 flex-shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 p-4 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Cover Image
                </label>
                <label className="flex items-center justify-center gap-2 border border-zinc-700 rounded-md py-3 hover:bg-zinc-900 cursor-pointer transition">
                  <Upload size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-300">
                    {image ? "Change" : "Upload"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImage(e.target.files)}
                  />
                </label>
                {imagePreview && (
                  <div className="mt-3">
                    <Image
                      src={imagePreview}
                      alt="preview"
                      width={100}
                      height={100}
                      className="rounded-md border border-zinc-700 object-cover h-24 w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </form>

          <div className="flex-shrink-0 p-4 border-t border-zinc-800 flex justify-end items-center gap-3">
            {error && <p className="text-red-400 text-xs mr-auto">{error}</p>}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !allFilled}
              className="px-5 py-2 text-sm font-medium rounded-md transition flex items-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Create"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const InputField = ({ label, ...props }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-zinc-300 mb-1">{label}</label>
    <input
      {...props}
      className="bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white transition"
    />
  </div>
);

const TextAreaField = ({ label, ...props }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-zinc-300 mb-1">{label}</label>
    <textarea
      {...props}
      rows={3}
      className="bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white transition resize-none"
    />
  </div>
);

const SelectField = ({ label, options, ...props }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-zinc-300 mb-1">{label}</label>
    <select
      {...props}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
    >
      {options.map((o: string) => (
        <option key={o} value={o}>
          {o.charAt(0) + o.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  </div>
);
