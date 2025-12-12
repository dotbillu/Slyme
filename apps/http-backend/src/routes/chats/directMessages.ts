import { Router } from "express";
import { prisma } from "@lib/prisma";
import type { Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();

const senderSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
};

// GET DM history
router.get("/:otherUserId", async (req, res) => {
  const { otherUserId } = req.params;
  const { currentUserId, skip, take } = req.query;

  if (!currentUserId)
    return res.status(400).json({ message: "Missing currentUserId" });

  try {
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId as string, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUserId as string },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: parseInt(skip as string) || 0,
      take: parseInt(take as string) || 30,
      include: {
        sender: { select: senderSelect },
        reactions: {
          select: {
            id: true,
            emoji: true,
            user: { select: { id: true, username: true, name: true } },
          },
        },
      },
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching DMs" });
  }
});

// get conversationlist {{{
router.get("/conversations/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const userSelect = {
      id: true,
      name: true,
      username: true,
      image: true,
      isOnline: true,
      lastSeen: true,
      publicKey: true, 
    };

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: userSelect },
        recipient: { select: userSelect },
      },
    });

    const conversations = new Map<string, any>();

    for (const message of messages) {
      const isMeSender = message.senderId === userId;
      const otherUser = isMeSender ? message.recipient : message.sender;

      if (!otherUser) continue;

      if (!conversations.has(otherUser.id)) {
        conversations.set(otherUser.id, {
          ...otherUser,
          lastMessage: message.content,
          lastMessageTimestamp: message.createdAt,
          unseenCount: 0,
        });
      }

      if (!isMeSender && !message.isRead) {
        const conv = conversations.get(otherUser.id);
        if (conv) {
          conv.unseenCount += 1;
        }
      }
    }

    res.json(Array.from(conversations.values()));
    
  } catch (err) {
    console.error("Error fetching DM conversations:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// }}}

// mark-read{{{
router.post("/mark-read", async (req, res) => {
  const { currentUserId, otherUserId } = req.body;

  if (!currentUserId || !otherUserId) {
    return res.status(400).json({ message: "Missing IDs" });
  }

  try {
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: currentUserId,
        isRead: false,
      },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

// }}}

router.delete("/message/:messageId", async (req, res) => {
  res
    .status(405)
    .json({ message: "Delete method now handled by WebSocket server" });
});

export default router;
