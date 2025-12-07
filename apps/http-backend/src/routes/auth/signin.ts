import { Router } from "express";
import { prisma } from "@lib/prisma";
import type { Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();

const profileInclude = {
  posts: {
    orderBy: { createdAt: "desc" as const },
    include: {
      likes: { select: { userId: true } },
      _count: { select: { likes: true, comments: true } },
    },
  },
  rooms: {
    include: {
      groupMessages: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        include: {
          sender: { select: { name: true } },
        },
      },
    },
  },
  mapRooms: {
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      latitude: true,
      longitude: true,
      type: true,
    },
  },
  gigs: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      title: true,
      description: true,
      latitude: true,
      longitude: true,
      date: true,
      imageUrls: true,
      type: true,
    },
  },
  followers: {
    select: { id: true, username: true, name: true, image: true },
  },
  following: {
    select: { id: true, username: true, name: true, image: true },
  },
};

const formatProfileRooms = (profile: any) => {
  if (!profile || !profile.rooms) return profile;

  const formattedRooms = profile.rooms.map((room: any) => {
    const lastMsg = room.groupMessages?.[0];
    let lastMessageContent = null;

    if (lastMsg) {
      lastMessageContent = `${lastMsg.sender.name}: ${lastMsg.content}`;
    }

    const { groupMessages, ...restOfRoom } = room;
    return {
      ...restOfRoom,
      lastMessage: lastMessageContent,
      lastMessageTimestamp: lastMsg ? lastMsg.createdAt : null,
    };
  });

  return {
    ...profile,
    rooms: formattedRooms,
  };
};

// Existing OAuth fetch route
router.get("/oauth/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: profileInclude,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const formattedUser = formatProfileRooms(user);
    res.status(200).json(formattedUser);
  } catch (err) {
    console.error(`Error fetching user: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
});

// UPDATED KEYGEN ROUTE (Fixes Case Sensitivity Issue)
router.post("/keygen", async (req, res) => {
  const { email, username, publicKey } = req.body;

  if (!email || !username || !publicKey) {
    return res.status(400).json({ error: "Email, Username, and Public Key are required" });
  }

  try {
    // 1. Find the current user securely (Case Insensitive Email Match)
    const currentUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive", // Matches User@Gmail.com to user@gmail.com
        },
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User account not found" });
    }

    // 2. Check if username is taken by SOMEONE ELSE
    const usernameOwner = await prisma.user.findUnique({
      where: { username },
    });

    // If username exists and belongs to a different ID than the current user
    if (usernameOwner && usernameOwner.id !== currentUser.id) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    // 3. Update the user using their ID
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        username: username,
        publicKey: publicKey,
      },
    });

    return res.status(200).json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Keygen update error:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
