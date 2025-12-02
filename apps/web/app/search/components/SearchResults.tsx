"use client";

import { Loader2, User, FileText, Briefcase, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchResult } from "@/lib/types";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/constants";

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onClose: () => void;
}

const ResultIcon = ({ type, data }: { type: string, data: any }) => {
  if (type === "user" && data.image) {
    const placeholder = `https://placehold.co/40x40/4f46e5/white?text=${data.name.charAt(0).toUpperCase()}`;
    const src = `${API_BASE_URL}/uploads/${data.image}`;
    return (
      <Image
        src={src}
        alt={data.name}
        width={24}
        height={24}
        onError={(e) => (e.currentTarget.src = placeholder)}
        className="w-6 h-6 rounded-full object-cover"
      />
    );
  }

  switch (type) {
    case "user":
      return <User className="w-4 h-4 text-gray-500" />;
    case "post":
      return <FileText className="w-4 h-4 text-gray-500" />;
    case "gig":
      return <Briefcase className="w-4 h-4 text-gray-500" />;
    case "room":
      return <MapPin className="w-4 h-4 text-gray-500" />;
    default:
      return null;
  }
};

export default function SearchResults({
  results,
  isLoading,
  onClose,
}: SearchResultsProps) {
  const router = useRouter();

  const handleResultClick = (item: SearchResult) => {
    onClose();
    let path = "/";
    switch (item.type) {
      case "user":
        path = `/profile/${item.data.username}`;
        break;
      case "post":
        path = `/post/${item.data.id}`;
        break;
      case "gig":
      case "room":
        path = `/map?id=${item.data.id}&type=${item.type}`;
        break;
    }
    router.push(path);
  };

  const getResultTitle = (item: SearchResult) => {
    switch (item.type) {
      case "user":
        return item.data.name;
      case "post":
        return item.data.content.substring(0, 50) + "...";
      case "gig":
        return item.data.title;
      case "room":
        return item.data.name;
    }
  };

  const getResultSubtitle = (item: SearchResult) => {
    switch (item.type) {
      case "user":
        return `@${item.data.username}`;
      case "post":
        return `by @${item.data.user.username}`;
      case "gig":
        return `Gig by @${item.data.createdBy.username}`;
      case "room":
        return `Room by @${item.data.createdBy.username}`;
    }
  };

  return (
    <div className="w-full max-h-96 overflow-y-auto bg-white rounded-b-lg shadow-xl border-t-0 border border-gray-200 z-50">
      {isLoading && (
        <div className="flex justify-center items-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <div className="p-4 text-gray-500 text-center">No results found.</div>
      )}

      {!isLoading &&
        results.length > 0 &&
        results.map((item) => (
          <div
            key={`${item.type}-${item.data.id}`}
            onClick={() => handleResultClick(item)}
            className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
          >
            <div className="shrink-0 mr-3 w-6 h-6 flex items-center justify-center">
              <ResultIcon type={item.type} data={item.data} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">
                {getResultTitle(item)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getResultSubtitle(item)}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
