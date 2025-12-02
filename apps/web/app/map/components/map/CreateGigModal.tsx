"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import { userAtom } from "@store";
import { GigElement, MapElement } from "./MapTypes";
import { X, Loader2, Upload, Link, Search } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import useDebounce from "@/hooks/useDebounce";
import Image from "next/image";
import { getImageUrl } from "@lib/utils";

type CreateGigModalProps = {
  location: { lat: number; lng: number };
  onClose: () => void;
  onSuccess: (newGig: GigElement) => void;
};

type RoomSearchResult = {
  id: string;
  name: string;
  imageUrl: string | null;
};

const fetchRoomSearch = async (
  query: string
): Promise<RoomSearchResult[]> => {
  if (query.trim().length === 0) return [];
  const res = await fetch(
    `${API_BASE_URL}/map/rooms/search?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
};

export default function CreateGigModal({
  location,
  onClose,
  onSuccess,
}: CreateGigModalProps) {
  const [user] = useAtom(userAtom);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "TASK",
    reward: "",
    date: "",
    time: "",
    expiresDate: "",
    expiresTime: "",
  });
  const [linkedRoom, setLinkedRoom] = useState<RoomSearchResult | null>(null);
  const [showRoomSearch, setShowRoomSearch] = useState(false);
  const [roomQuery, setRoomQuery] = useState("");
  const debouncedRoomQuery = useDebounce(roomQuery, 300);

  const [images, setImages] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: roomResults, isLoading: isRoomSearchLoading } = useQuery({
    queryKey: ["room-search", debouncedRoomQuery],
    queryFn: () => fetchRoomSearch(debouncedRoomQuery),
    enabled: debouncedRoomQuery.length > 0,
  });

  const allFilled =
    form.title &&
    form.description &&
    form.reward &&
    form.type &&
    form.date &&
    form.time &&
    form.expiresDate &&
    form.expiresTime;

  const handleImages = (files: FileList | null) => {
    if (files && files.length > 5) {
      setError("You can only upload a maximum of 5 images.");
      return;
    }
    setImages(files);
    setError("");
    if (!files) {
      setImagePreviews([]);
      return;
    }
    const previews = Array.from(files).map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
  };

  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}`).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError("You must log in first.");
    if (!allFilled) return setError("Fill all fields before submitting.");
    setIsLoading(true);
    setError("");

    const gigDate = combineDateTime(form.date, form.time);
    const gigExpiresAt = combineDateTime(form.expiresDate, form.expiresTime);

    if (!gigDate || !gigExpiresAt) {
      setError("Invalid date or time.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("creatorId", user.id);
    formData.append("type", form.type);
    formData.append("reward", form.reward);
    formData.append("date", gigDate);
    formData.append("expiresAt", gigExpiresAt);
    if (linkedRoom) {
      formData.append("roomId", linkedRoom.id);
    }
    if (images)
      Array.from(images).forEach((img) => formData.append("images", img));

    try {
      const res = await fetch(`${API_BASE_URL}/map/gig`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Failed to create gig");
      const newGig = await res.json();
      onSuccess(newGig);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg border border-zinc-800 bg-black shadow-2xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Create Gig</h2>
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
              <InputField
                label="Title"
                name="title"
                value={form.title}
                onChange={handleFieldChange}
                placeholder="e.g., Campus Event Photography"
              />
              <TextAreaField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleFieldChange}
                placeholder="Describe the gig details..."
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Reward"
                  name="reward"
                  value={form.reward}
                  onChange={handleFieldChange}
                  placeholder="e.g., 500 or Free Lunch"
                />
                <SelectField
                  label="Type"
                  name="type"
                  value={form.type}
                  onChange={handleFieldChange}
                  options={["TASK", "EVENT", "CLEAN", "BUILD", "OTHER"]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Date"
                  name="date"
                  value={form.date}
                  onChange={handleFieldChange}
                  type="date"
                />
                <InputField
                  label="Time"
                  name="time"
                  value={form.time}
                  onChange={handleFieldChange}
                  type="time"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Expires Date"
                  name="expiresDate"
                  value={form.expiresDate}
                  onChange={handleFieldChange}
                  type="date"
                />
                <InputField
                  label="Expires Time"
                  name="expiresTime"
                  value={form.expiresTime}
                  onChange={handleFieldChange}
                  type="time"
                />
              </div>
            </div>

            <div className="w-full md:w-64 flex-shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Images (max 5)
                </label>
                <label className="flex items-center justify-center gap-2 border border-zinc-700 rounded-md py-3 hover:bg-zinc-900 cursor-pointer transition">
                  <Upload size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-300">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImages(e.target.files)}
                  />
                </label>
                {imagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {imagePreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="preview"
                        className="rounded-md border border-zinc-700 object-cover h-16 w-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Linked Room
                </label>
                {linkedRoom ? (
                  <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-700 rounded-md">
                    <Image
                      src={getImageUrl(linkedRoom.imageUrl)}
                      alt={linkedRoom.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <span className="text-sm text-white truncate flex-1">
                      {linkedRoom.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLinkedRoom(null)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRoomSearch((s) => !s)}
                    className="flex items-center justify-center gap-2 w-full border border-zinc-700 rounded-md py-3 hover:bg-zinc-900 cursor-pointer transition"
                  >
                    <Link size={16} className="text-zinc-400" />
                    <span className="text-sm text-zinc-300">Link a Room</span>
                  </button>
                )}
              </div>

              {showRoomSearch && !linkedRoom && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search rooms..."
                      value={roomQuery}
                      onChange={(e) => setRoomQuery(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 pl-8 text-sm text-white focus:outline-none focus:border-zinc-500"
                    />
                    <Search
                      size={16}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {isRoomSearchLoading && (
                      <div className="flex justify-center p-2">
                        <Loader2 size={16} className="animate-spin text-zinc-400" />
                      </div>
                    )}
                    {roomResults?.map((room) => (
                      <button
                        type="button"
                        key={room.id}
                        onClick={() => {
                          setLinkedRoom(room);
                          setShowRoomSearch(false);
                          setRoomQuery("");
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800"
                      >
                        <Image
                          src={getImageUrl(room.imageUrl)}
                          alt={room.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span className="text-sm text-white truncate">
                          {room.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          <div className="flex-shrink-0 p-4 border-t border-zinc-800 flex justify-end gap-3">
            {error && <p className="text-red-400 text-sm mr-auto">{error}</p>}
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
                "Create Gig"
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
      className="bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white transition [color-scheme:dark]"
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
