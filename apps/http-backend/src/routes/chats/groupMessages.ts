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

router.get("/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  const skip = parseInt(req.query.skip as string) || 0;
  const take = parseInt(req.query.take as string) || 30;

  try {
    const messages = await prisma.groupMessage.findMany({
      where: { roomId: roomId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        sender: {
          select: { id: true, username: true, name: true, image: true }
        },
      },
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching group messages" });
  }
});
// --- POST route (REMOVED) ---
// This logic is now handled by the ws-backend via 'group:send' event

// --- DELETE route (REMOVED) ---
// This logic is now handled by the ws-backend via 'message:delete' event

export default router;
