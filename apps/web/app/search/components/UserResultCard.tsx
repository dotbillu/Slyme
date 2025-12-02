"use client";

import { SearchUser } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { getImageUrl } from "@/lib/utils";

export default function UserResultCard({ user }: { user: SearchUser }) {
  const placeholder = `https://placehold.co/40x40/4f46e5/white?text=${user.name
    .charAt(0)
    .toUpperCase()}`;
  const src = getImageUrl(user.image);

  return (
    <Link href={`/profile/${user.username}`}>
      <div className="p-4 hover:bg-zinc-900 transition-colors">
        <div className="flex items-center gap-3">
          <Image
            src={src}
            alt={user.name}
            width={48}
            height={48}
            onError={(e) => (e.currentTarget.src = placeholder)}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h4 className="font-bold text-white hover:underline">{user.name}</h4>
            <p className="text-sm text-zinc-400">@{user.username}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
