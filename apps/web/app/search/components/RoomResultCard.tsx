"use client";

import { SearchRoom } from "@/lib/types";
import Link from "next/link";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";

export default function RoomResultCard({ room }: { room: SearchRoom }) {
  const imageUrl = getImageUrl(room.imageUrl);
  const placeholder = `https://placehold.co/40x40/3f3f46/a3e635?text=${room.name
    .charAt(0)
    .toUpperCase()}`;

  return (
    <Link href={`/map?id=${room.id}&type=room`}>
      <div className="p-4 hover:bg-zinc-900 transition-colors">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mt-1">
            {imageUrl.includes("default-placeholder") ? (
              <MapPin className="w-5 h-5 text-green-400" />
            ) : (
              <Image
                src={imageUrl}
                alt={room.name}
                width={40}
                height={40}
                onError={(e) => (e.currentTarget.src = placeholder)}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
          </div>
          <div>
            <h4 className="font-bold text-white hover:underline">
              {room.name}
            </h4>
            <p className="text-sm text-zinc-400">
              Room by @{room.createdBy.username}
            </p>
            {room.description && (
              <p className="text-sm text-zinc-300 mt-1 line-clamp-2">
                {room.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
