import { Router } from "express";
import { prisma } from "@lib/prisma";
import type { Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();


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

export default router;
