"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { getImageUrl } from "../../lib/utils";
import Link from "next/link";
import { Gig } from "@/lib/types";

export default function ProfileGig({
  gig,
  userName,
  userImageUrl,
}: {
  gig: Gig;
  userName: string;
  userImageUrl?: string | null;
}) {
  const hasImages = gig.imageUrls && gig.imageUrls.length > 0;

  return (
    <Link href={`/map?gigId=${gig.id}`} className="block">
      <motion.div
        key={gig.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="p-4 border-b border-zinc-700 transition-colors hover:bg-white/5 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {userImageUrl ? (
              <Image
                src={getImageUrl(userImageUrl)}
                alt={userName}
                width={40}
                height={40}
                className="rounded-full object-cover w-10 h-10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg">
                {userName[0]}
              </div>
            )}
            <div className="flex items-center gap-2">
              <p className="text-white font-bold">{userName}</p>
              <p className="text-zinc-400 text-sm">
                · posted a {gig.type || "gig"}
              </p>
            </div>
          </div>

          {gig.date && (
            <p className="text-zinc-400 text-sm flex items-center gap-1">
              <Calendar size={16} />
              {new Date(gig.date).toLocaleDateString()}
            </p>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mt-2">{gig.title}</h3>

        {gig.description && (
          <p className="text-zinc-200 whitespace-pre-wrap wrap-break-words line-clamp-8 mt-1">
            {gig.description}
          </p>
        )}

        {/* Image Grid */}
        {hasImages && (
          <div className="relative w-full max-w-xl h-80 rounded-2xl overflow-hidden mt-3 border border-zinc-700">
            <Image
              src={getImageUrl(gig.imageUrls[0])}
              alt={gig.title}
              fill
              style={{ objectFit: "cover" }}
            />
            {gig.imageUrls.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                1 / {gig.imageUrls.length}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </Link>
  );
}
