"use client";

import { SearchGig } from "@/lib/types";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";

export default function GigResultCard({ gig }: { gig: SearchGig }) {
  const imageUrl =
    gig.imageUrls && gig.imageUrls.length > 0
      ? getImageUrl(gig.imageUrls[0])
      : null;

  const placeholder =
    "https://placehold.co/40x40/3f3f46/94a3b8?text=GIG";

  return (
    <Link href={`/map?id=${gig.id}&type=gig`}>
      <div className="p-4 hover:bg-zinc-900 transition-colors">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mt-1">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={gig.title}
                width={40}
                height={40}
                onError={(e) => (e.currentTarget.src = placeholder)}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <Briefcase className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-white hover:underline">
              {gig.title}
            </h4>
            <p className="text-sm text-zinc-400">
              Gig by @{gig.createdBy.username}
            </p>
            {gig.description && (
              <p className="text-sm text-zinc-300 mt-1 line-clamp-2">
                {gig.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
