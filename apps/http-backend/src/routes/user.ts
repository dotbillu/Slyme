import { Router } from "express";
import { prisma } from "@lib/prisma";
import type { Router as ExpressRouter } from "express";
import { upload } from "@multer";

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
router.post("/follow", async (req, res) => {
  const { currentUserId, targetUsername } = req.body;

  if (!currentUserId || !targetUsername) {
    return res
      .status(400)
      .json({ message: "currentUserId and targetUsername are required" });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const isFollowing = await prisma.user.count({
      where: {
        id: currentUserId,
        following: {
          some: {
            id: targetUser.id,
          },
        },
      },
    });

    let actionMessage: string;

    if (isFollowing > 0) {
      await prisma.user.update({
        where: { id: currentUserId },
        data: {
          following: {
            disconnect: { id: targetUser.id },
          },
        },
      });
      actionMessage = "User unfollowed successfully";
    } else {
      await prisma.user.update({
        where: { id: currentUserId },
        data: {
          following: {
            connect: { id: targetUser.id },
          },
        },
      });
      actionMessage = "User followed successfully";
    }

    const updatedTargetProfile = await prisma.user.findUnique({
      where: { username: targetUsername },
      include: profileInclude,
    });

    const formattedProfile = formatProfileRooms(updatedTargetProfile);
    res.status(200).json({
      message: actionMessage,
      profile: formattedProfile,
    });
  } catch (err) {
    console.error("Error toggling follow:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/profile/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: profileInclude,
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const formattedProfile = formatProfileRooms(user);
    res.json(formattedProfile);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch(
  "/profile/:username",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "posterImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const { username } = req.params;
    const { name } = req.body;

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };
    const imageFile = files?.["image"]?.[0];
    const posterImageFile = files?.["posterImage"]?.[0];

    try {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updateData: {
        name?: string;
        image?: string;
        posterImage?: string;
      } = {};

      if (name && name !== existingUser.name) {
        updateData.name = name;
      }

      if (imageFile) {
        updateData.image = imageFile.filename;
      }

      if (posterImageFile) {
        updateData.posterImage = posterImageFile.filename;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { username },
          data: updateData,
        });

        if (updateData.name) {
          await prisma.post.updateMany({
            where: { username },
            data: { name: updateData.name },
          });
        }
      }

      const updatedFullProfile = await prisma.user.findUnique({
        where: { username },
        include: profileInclude,
      });

      console.log(`Updated profile for: ${username}`);
      const formattedProfile = formatProfileRooms(updatedFullProfile);
      res.status(200).json(formattedProfile);
    } catch (err) {
      console.error(`Error updating profile for ${username}:`, err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
