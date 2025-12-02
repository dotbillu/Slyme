"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  Suspense,
  useCallback,
} from "react";
import { useAtom } from "jotai";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import { useSearchParams, useRouter } from "next/navigation";
import { locationAtom, userAtom } from "@store";
import { Home, Star, MoreVertical, Plus, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getImageUrl, getHaversineDistanceInMeters } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/constants";

import { mapOptions } from "./map/mapOptions";
import { MapElement, GigElement } from "./map/MapTypes";
import GigDetailSidebar from "./map/GigDetailSidebar";
import RoomDetailSidebar from "./map/RoomDetailSidebar";
import Lightbox from "./map/Lightbox";
import CreateRoomModal from "./map/CreateRoomModal";
import CreateGigModal from "./map/CreateGigModal";

const sanitizeCoords = (item: any) => {
  if (!item) return null;
  const lat = parseFloat(item.latitude);
  const lng = parseFloat(item.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { ...item, latitude: lat, longitude: lng };
};

function MapContent() {
  const [user] = useAtom(userAtom);
  const [location, setLocation] = useAtom(locationAtom);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [rooms, setRooms] = useState<MapElement[]>([]);
  const [gigs, setGigs] = useState<GigElement[]>([]);
  const [selectedGig, setSelectedGig] = useState<GigElement | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<MapElement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isRoomModalOpen, setRoomModalOpen] = useState(false);
  const [isGigModalOpen, setGigModalOpen] = useState(false);
  const [showRooms, setShowRooms] = useState(true);
  const [showGigs, setShowGigs] = useState(true);
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUrlProcessed = useRef(false);

  if (!apiKey) throw new Error("Google Maps API key missing...");

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  const icons = useMemo(() => {
    if (!isLoaded) return null;
    const g = (window as any).google;
    if (!g) return null;

    const commonSize = new g.maps.Size(36, 36);
    return {
      room: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="white"/><path d="M8 21V11H16V21" stroke="#09090b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 10L12 3L21 10" stroke="#09090b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          ),
        scaledSize: commonSize,
      },
      gig: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#09090b" stroke="white" stroke-width="1.5"/><path d="M12 17.27L18.18 21L17 14.14L22 9.27L15.09 8.26L12 2L8.91 8.26L2 9.27L7 14.14L5.82 21L12 17.27Z" fill="white"/></svg>',
          ),
        scaledSize: commonSize,
      },
      user: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#3B82F6" stroke="#FFFFFF" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>',
          ),
        scaledSize: new g.maps.Size(32, 32),
      },
    };
  }, [isLoaded]);

  const handleSelectRoom = useCallback(
    (room: MapElement) => {
      setSelectedRoom(room);
      setSelectedGig(null);
      setIsSidebarOpen(true);
      router.push(`/map?roomId=${room.id}`, { scroll: false });
    },
    [router],
  );

  const handleSelectGig = useCallback(
    (gig: GigElement) => {
      setSelectedGig(gig);
      setSelectedRoom(null);
      setIsSidebarOpen(true);
      router.push(`/map?gigId=${gig.id}`, { scroll: false });
    },
    [router],
  );

  const closeSidebar = useCallback(() => {
    setSelectedGig(null);
    setSelectedRoom(null);
    setIsSidebarOpen(false);
    router.push(`/map`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocation({ lat: 28.4089, lng: 77.3178 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) setPermissionDenied(true);
        setLocation({ lat: 28.4089, lng: 77.3178 });
      },
    );
  }, [setLocation]);

  useEffect(() => {
    if (!isLoaded) return;
    const fetchData = async () => {
      try {
        const [roomRes, gigRes] = await Promise.all([
          fetch(`${API_BASE_URL}/map/rooms`),
          fetch(`${API_BASE_URL}/map/gigs`),
        ]);
        const roomsData = (await roomRes.json())
          .map(sanitizeCoords)
          .filter(Boolean);
        const gigsData = (await gigRes.json())
          .map(sanitizeCoords)
          .filter(Boolean);

        const allElements = [
          ...roomsData.map((r: MapElement) => ({ ...r, type: "room" })),
          ...gigsData.map((g: GigElement) => ({ ...g, type: "gig" })),
        ];

        const JITTER_AMOUNT = 0.00008;
        for (let i = 0; i < allElements.length; i++) {
          for (let j = i + 1; j < allElements.length; j++) {
            const dist = getHaversineDistanceInMeters(
              allElements[i].latitude,
              allElements[i].longitude,
              allElements[j].latitude,
              allElements[j].longitude,
            );

            if (dist < 10) {
              allElements[j].latitude += (Math.random() - 0.5) * JITTER_AMOUNT;
              allElements[j].longitude += (Math.random() - 0.5) * JITTER_AMOUNT;
            }
          }
        }

        const finalRooms = allElements.filter((el) => el.type === "room");
        const finalGigs = allElements.filter((el) => el.type === "gig");

        setRooms(finalRooms as MapElement[]);
        setGigs(finalGigs as GigElement[]);

        if (!initialUrlProcessed.current) {
          const gigIdFromUrl = searchParams.get("gigId");
          const roomIdFromUrl = searchParams.get("roomId");
          const idFromUrl = searchParams.get("id");
          const typeFromUrl = searchParams.get("type");

          const finalGigId =
            gigIdFromUrl || (typeFromUrl === "gig" ? idFromUrl : null);
          const finalRoomId =
            roomIdFromUrl || (typeFromUrl === "room" ? idFromUrl : null);

          if (finalGigId) {
            const gigToSelect = finalGigs.find(
              (g: GigElement) => g.id === finalGigId,
            );
            if (gigToSelect) handleSelectGig(gigToSelect);
          } else if (finalRoomId) {
            const roomToSelect = finalRooms.find(
              (r: MapElement) => r.id === finalRoomId,
            );
            if (roomToSelect) handleSelectRoom(roomToSelect);
          }
          initialUrlProcessed.current = true;
        }
      } catch (e) {
        console.error("Failed fetching map data:", e);
      }
    };
    fetchData();
  }, [isLoaded, searchParams, handleSelectGig, handleSelectRoom]);

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/map/room/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Failed to join room");
      const { room: updatedRoom } = await res.json();
      const sanitizedRoom = sanitizeCoords(updatedRoom) as MapElement;
      setRooms((prev) =>
        prev.map((r) => (r.id === sanitizedRoom.id ? sanitizedRoom : r)),
      );
      setSelectedRoom(sanitizedRoom);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGigEdit = async (
    updatedData: Partial<GigElement> & { roomId?: string | null },
  ) => {
    if (!selectedGig) return;
    try {
      const res = await fetch(`${API_BASE_URL}/map/gig/${selectedGig.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Failed to update gig");
      const { gig: updatedGig } = await res.json();
      const sanitizedGig = sanitizeCoords(updatedGig) as GigElement;
      setGigs((prev) =>
        prev.map((g) => (g.id === sanitizedGig.id ? sanitizedGig : g)),
      );
      setSelectedGig(sanitizedGig);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRoomEdit = async (updatedData: {
    name: string;
    description: string;
  }) => {
    if (!selectedRoom) return;
    try {
      const res = await fetch(`${API_BASE_URL}/map/room/${selectedRoom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Failed to update room");
      const { room: updatedRoom } = await res.json();
      const sanitizedRoom = sanitizeCoords(updatedRoom) as MapElement;
      setRooms((prev) =>
        prev.map((r) => (r.id === sanitizedRoom.id ? sanitizedRoom : r)),
      );
      setSelectedRoom(sanitizedRoom);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRoomFromSidebar = (room: MapElement) => {
    if (room) {
      handleSelectRoom(room);
    }
  };

  const handleDelete = async (el: MapElement | GigElement | null) => {
    if (!el || !user || user.id !== el.createdBy?.id) return;
    const type = "title" in el ? "gig" : "room";
    if (!window.confirm(`Delete this ${type}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/map/${type}/${el.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");

      if (type === "gig") {
        setGigs((prev) => prev.filter((g) => g.id !== el.id));
      } else {
        setRooms((prev) => prev.filter((r) => r.id !== el.id));
      }
      closeSidebar();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenLightbox = (i: number) => {
    setLightboxIndex(i);
    setLightboxOpen(true);
  };

  const center = useMemo(() => {
    const lat = parseFloat(location.lat as any);
    const lng = parseFloat(location.lng as any);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return { lat: 28.4089, lng: 77.3178 };
  }, [location]);

  if (permissionDenied)
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        Please allow location access
      </div>
    );

  if (!isLoaded || !icons)
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        Loading map...
      </div>
    );

  return (
    <div className="relative h-full w-full bg-black">
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="absolute top-0 left-0 z-40 h-full w-full md:w-[480px]">
            {selectedGig && (
              <GigDetailSidebar
                key="gig-sidebar"
                gig={selectedGig}
                currentUser={user}
                userLocation={center}
                onCloseAction={closeSidebar}
                onDeleteAction={() => handleDelete(selectedGig)}
                onShowLightboxAction={handleOpenLightbox}
                onSaveEditAction={handleSaveGigEdit}
                onSelectRoomAction={handleSelectRoomFromSidebar}
              />
            )}
            {selectedRoom && (
              <RoomDetailSidebar
                key="room-sidebar"
                room={selectedRoom}
                currentUserId={user?.id}
                onCloseAction={closeSidebar}
                onDeleteAction={() => handleDelete(selectedRoom)}
                onJoinAction={() => handleJoinRoom(selectedRoom.id)}
                onSaveEditAction={handleSaveRoomEdit}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {isLightboxOpen && selectedGig && (
        <Lightbox
          images={selectedGig.imageUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="absolute top-4 right-4 z-30 flex flex-col items-end">
        <button
          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all hover:bg-zinc-100"
        >
          <MoreVertical size={24} />
        </button>
        <AnimatePresence>
          {isFilterMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="mt-2 flex min-w-160px flex-col gap-2 rounded-xl bg-white p-2 shadow-xl"
            >
              <button
                onClick={() => setShowRooms(!showRooms)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  showRooms
                    ? "bg-zinc-100 text-black"
                    : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home size={16} />
                  <span>Rooms</span>
                </div>
                {showRooms && <Check size={14} />}
              </button>
              <button
                onClick={() => setShowGigs(!showGigs)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  showGigs
                    ? "bg-zinc-100 text-black"
                    : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star size={16} />
                  <span>Gigs</span>
                </div>
                {showGigs && <Check size={14} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-3 right-4 z-30 flex flex-col items-end gap-4 md:bottom-8">
        <button
          onClick={() => setRoomModalOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all hover:bg-zinc-100 md:h-auto md:w-auto md:px-5 md:py-3"
        >
          <div className="relative">
            <Home size={24} />
            <div className="absolute -right-2 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white md:hidden">
              <Plus size={12} />
            </div>
          </div>
          <span className="ml-2 hidden text-sm font-semibold md:block">
            Create Room
          </span>
        </button>
        <button
          onClick={() => setGigModalOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all hover:bg-zinc-100 md:h-auto md:w-auto md:px-5 md:py-3"
        >
          <div className="relative">
            <Star size={24} />
            <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white md:hidden">
              <Plus size={12} />
            </div>
          </div>
          <span className="ml-2 hidden text-sm font-semibold md:block">
            Create Gig
          </span>
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={15}
        options={mapOptions}
        onClick={closeSidebar}
      >
        <MarkerF position={center} icon={icons.user} zIndex={2} />

        {showRooms &&
          rooms.map((r) => (
            <MarkerF
              key={`room-${r.id}`}
              position={{ lat: r.latitude, lng: r.longitude }}
              icon={
                r.imageUrl
                  ? {
                      url: getImageUrl(r.imageUrl),
                      scaledSize: new (window as any).google.maps.Size(36, 36),
                    }
                  : icons.room
              }
              onClick={() => handleSelectRoom(r)}
              zIndex={5}
            />
          ))}

        {showGigs &&
          gigs.map((g) => (
            <MarkerF
              key={`gig-${g.id}`}
              position={{ lat: g.latitude, lng: g.longitude }}
              icon={icons.gig}
              onClick={() => handleSelectGig(g)}
              zIndex={5}
            />
          ))}
      </GoogleMap>

      {isRoomModalOpen && (
        <CreateRoomModal
          location={center}
          onClose={() => setRoomModalOpen(false)}
          onSuccess={(newRoom) => {
            const sanitizedRoom = sanitizeCoords(newRoom);
            if (sanitizedRoom) {
              setRooms((p) => [...p, sanitizedRoom as MapElement]);
            }
            setRoomModalOpen(false);
          }}
        />
      )}
      {isGigModalOpen && (
        <CreateGigModal
          location={center}
          onClose={() => setGigModalOpen(false)}
          onSuccess={(newGig) => {
            const sanitizedGig = sanitizeCoords(newGig);
            if (sanitizedGig) {
              setGigs((p) => [...p, sanitizedGig as GigElement]);
            }
            setGigModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function MapComponentWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-black">
          <span className="loading loading-dots loading-lg" />
        </div>
      }
    >
      <MapContent />
    </Suspense>
  );
}
