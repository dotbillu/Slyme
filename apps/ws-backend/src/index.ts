import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
require("dotenv").config();

const prisma = new PrismaClient();

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.end();
    return;
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const LISTENING_PORT = parseInt(process.env.WS_PORT || "8213");

// --- SELECTORS ---
const senderSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  isOnline: true,
  lastSeen: true,
  publicKey: true,
};

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

io.on("connection", (socket: AuthenticatedSocket) => {
  socket.on("authenticate", async (userId: string) => {
    try {
      if (!userId) return;
      socket.userId = userId;
      socket.join(userId);

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
        select: senderSelect,
      });

      const userRooms = await prisma.mapRoom.findMany({
        where: { members: { some: { id: userId } } },
        select: { id: true },
      });

      userRooms.forEach((room: any) => {
        socket.to(room.id).emit("user:status", user);
      });
    } catch (err) {
      console.error("Authentication error");
    }
  });

  socket.on("join:rooms", (roomIds: string[]) => {
    roomIds.forEach((id) => socket.join(id));
  });

  socket.on(
    "dm:send",
    async (data: {
      senderId: string;
      recipientId: string;
      content: string;
      nonce?: string;
      tempId: string;
    }) => {
      try {
        const sender = await prisma.user.findUnique({
          where: { id: data.senderId },
          select: senderSelect,
        });

        if (!sender) return;

        const optimisticMessage = {
          id: data.tempId,
          content: data.content,
          senderId: data.senderId,
          recipientId: data.recipientId,
          createdAt: new Date().toISOString(),
          sender,
          nonce: data.nonce || null,
          senderPublicKey: sender.publicKey || null,
          isRead: false,
        };

        socket.to(data.recipientId).emit("dm:receive", optimisticMessage);
        socket.emit("dm:confirm", {
          tempId: data.tempId,
          message: optimisticMessage,
        });

        await prisma.directMessage.create({
          data: {
            id: data.tempId, 
            senderId: data.senderId,
            recipientId: data.recipientId,
            content: data.content,
            nonce: data.nonce || null,
            senderPublicKey: sender.publicKey || null,
          },
        });
      } catch (err: any) {
        console.error("Error sending DM:", err.message);
        socket.emit("message:error", {
          tempId: data.tempId,
          error: "Failed to save",
        });
      }
    },
  );

  socket.on(
    "group:send",
    async (data: {
      senderId: string;
      roomId: string;
      content: string;
      tempId: string;
    }) => {
      try {
        const sender = await prisma.user.findUnique({
          where: { id: data.senderId },
          select: senderSelect,
        });

        if (!sender) return;

        const optimisticMessage = {
          id: data.tempId,
          content: data.content,
          senderId: data.senderId,
          roomId: data.roomId,
          createdAt: new Date().toISOString(),
          sender,
        };

        io.to(data.roomId).emit("group:receive", {
          tempId: data.tempId,
          message: optimisticMessage,
        });

        await prisma.groupMessage.create({
          data: {
            id: data.tempId,
            senderId: data.senderId,
            roomId: data.roomId,
            content: data.content,
          },
        });
      } catch (err) {
        console.error("Error sending group message", err);
        socket.emit("message:error", {
          tempId: data.tempId,
          error: "Failed to save",
        });
      }
    },
  );

  socket.on(
    "conversation:mark_seen",
    async (data: { senderId: string; conversationId: string; type: "dm" | "room" }) => {
      if (data.type === "dm" && socket.userId) {
        socket.to(data.conversationId).emit("conversation:seen", {
          viewerId: socket.userId,
          time: new Date().toISOString(),
        });

        try {
           await prisma.directMessage.updateMany({
             where: {
               senderId: data.conversationId, 
               recipientId: socket.userId,
               isRead: false
             },
             data: { isRead: true }
           });
        } catch(e) { console.log(e); }
      }
    },
  );

  socket.on(
    "message:delete",
    async (data: {
      userId: string;
      messageId: string;
      messageType: "dm" | "group";
    }) => {
      try {
        const { userId, messageId, messageType } = data;
        let conversationId: string;
        let recipientId: string | null = null;

        if (messageType === "dm") {
          const msg = await prisma.directMessage.findUnique({
            where: { id: messageId },
          });
          if (!msg || msg.senderId !== userId) return;

          await prisma.directMessage.delete({ where: { id: msg.id } });
          conversationId = msg.senderId;
          recipientId = msg.recipientId;
        } else {
          const msg = await prisma.groupMessage.findUnique({
            where: { id: messageId },
          });
          if (!msg || msg.senderId !== userId) return;

          await prisma.groupMessage.delete({ where: { id: msg.id } });
          conversationId = msg.roomId;
        }

        io.to(conversationId).emit("message:deleted", messageId);
        if (recipientId) {
          io.to(recipientId).emit("message:deleted", messageId);
        }
      } catch (err) {
        console.error("Error deleting message");
      }
    },
  );

  socket.on(
    "typing:start",
    (data: { conversationId: string; isGroup: boolean; senderName: string }) => {
      if (data.isGroup) {
        socket.to(data.conversationId).emit("user:typing", {
          conversationId: data.conversationId,
          name: data.senderName,
        });
      } else {
        socket.to(data.conversationId).emit("user:typing", {
          conversationId: socket.userId,
          name: data.senderName,
        });
      }
    },
  );

  socket.on(
    "typing:stop",
    (data: { conversationId: string; isGroup: boolean }) => {
      if (data.isGroup) {
        socket
          .to(data.conversationId)
          .emit("user:stopped-typing", { conversationId: data.conversationId });
      } else {
        socket
          .to(data.conversationId)
          .emit("user:stopped-typing", { conversationId: socket.userId });
      }
    },
  );

  socket.on("disconnect", async () => {
    if (socket.userId) {
      try {
        const user = await prisma.user.update({
          where: { id: socket.userId },
          data: { isOnline: false, lastSeen: new Date() },
          select: senderSelect,
        });

        const userRooms = await prisma.mapRoom.findMany({
          where: { members: { some: { id: socket.userId } } },
          select: { id: true },
        });

        userRooms.forEach((room: any) => {
          socket.to(room.id).emit("user:status", user);
        });
      } catch (err) {
        console.error("Error on disconnect");
      }
    }
  });
});

httpServer.listen(LISTENING_PORT, "0.0.0.0", () => {
  console.log(`WS server listening on ${LISTENING_PORT}`);
});
