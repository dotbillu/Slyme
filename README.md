# Slyme

<div align="center">
  <div align="center">
  <img src="./media/uslymelogo.png" alt="Slyme Logo" width="120" height="120" />
</div>dude ifirst oa l thisis ws-baceknda  differtn foldete and full erros isthi
[dotenv@17.2.3] injecting env (1) from .env -- tip: ✅ audit secrets and track compliance: https://dotenvx.com/ops
Authentication error
Authentication error
Authentication error
Error sending DM
Error sending DM
Error sending DM
Error sending DM
Error sending DM









 thsis the code tell me whichpart is throwingthiimport { createServer } from "http";
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

const LISTENING_PORT = parseInt(
  process.env.PORT || process.env.WS_PORT || "8213",
);
const SELF_URL =
  process.env.NEXT_PUBLIC_WS_SERVER_LINK ||
  `http://localhost:${LISTENING_PORT}`;

const senderSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  isOnline: true,
  lastSeen: true,
};

const reactionSelect = {
  id: true,
  emoji: true,
  user: { select: senderSelect },
};

const messageInclude = {
  sender: { select: senderSelect },
  reactions: { select: reactionSelect },
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
    } catch (err: any) {
      console.error("Authentication error");
    }
  });

  socket.on("join:rooms", (roomIds: string[]) => {
    roomIds.forEach((id: string) => socket.join(id));
  });

  socket.on(
    "dm:send",
    async (data: {
      senderId: string;
      recipientId: string;
      content: string;
      tempId: string;
    }) => {
      try {
        const msg = await prisma.directMessage.create({
          data: {
            senderId: data.senderId,
            recipientId: data.recipientId,
            content: data.content,
          },
          include: messageInclude,
        });

        socket.emit("dm:confirm", { tempId: data.tempId, message: msg });
        socket.to(data.recipientId).emit("dm:receive", msg);
      } catch (err: any) {
        console.error("Error sending DM");
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
        const msg = await prisma.groupMessage.create({
          data: {
            senderId: data.senderId,
            roomId: data.roomId,
            content: data.content,
          },
          include: messageInclude,
        });

        io.to(data.roomId).emit("group:receive", {
          tempId: data.tempId,
          message: msg,
        });
      } catch (err: any) {
        console.error("Error sending group message");
      }
    },
  );

  socket.on(
    "reaction:toggle",
    async (data: {
      userId: string;
      emoji: string;
      groupMessageId?: string;
      directMessageId?: string;
    }) => {
      try {
        const { userId, emoji, groupMessageId, directMessageId } = data;

        const existing = await prisma.reaction.findFirst({
          where: {
            userId: userId,
            emoji,
            groupMessageId: groupMessageId ? groupMessageId : undefined,
            directMessageId: directMessageId ? directMessageId : undefined,
          },
        });

        let savedReaction: any;
        let action: "added" | "removed" = "added";
        let messageId: string;
        let conversationId: string | undefined;

        if (existing) {
          await prisma.reaction.delete({ where: { id: existing.id } });
          action = "removed";
          savedReaction = existing;
          messageId = (groupMessageId || directMessageId)!;
        } else {
          savedReaction = await prisma.reaction.create({
            data: {
              userId: userId,
              emoji,
              groupMessageId: groupMessageId ? groupMessageId : undefined,
              directMessageId: directMessageId ? directMessageId : undefined,
            },
            select: reactionSelect,
          });
          action = "added";
          messageId = (groupMessageId || directMessageId)!;
        }

        if (groupMessageId) {
          const msg = await prisma.groupMessage.findUnique({
            where: { id: groupMessageId },
          });
          if (msg) conversationId = msg.roomId;
        } else {
          const msg = await prisma.directMessage.findUnique({
            where: { id: directMessageId },
          });
          if (msg) {
            io.to(msg.senderId).emit("reaction:update", {
              action,
              reaction: savedReaction,
              messageId,
            });
            io.to(msg.recipientId).emit("reaction:update", {
              action,
              reaction: savedReaction,
              messageId,
            });
            return;
          }
        }

        if (conversationId) {
          io.to(conversationId).emit("reaction:update", {
            action,
            reaction: savedReaction,
            messageId,
          });
        }
      } catch (err: any) {
        console.error("Error toggling reaction");
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
      } catch (err: any) {
        console.error("Error deleting message");
      }
    },
  );

  socket.on(
    "typing:start",
    (data: {
      conversationId: string;
      isGroup: boolean;
      senderName: string;
    }) => {
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
      } catch (err: any) {
        console.error("Error on disconnect");
      }
    }
  });
});

httpServer.listen(LISTENING_PORT, "0.0.0.0", () => {
  if (process.env.NODE_ENV === "production" && SELF_URL) {
    setInterval(
      async () => {
        try {
          const response = await fetch(`${SELF_URL}/health`);
        } catch (error) {
          console.error("Keep-alive ping failed");
        }
      },
      14 * 60 * 1000,
    );
  }
});

  <br />
  <h3>Gamified hyperlocal social network.</h3>
  
  <a href="https://slyme-dotbillu.vercel.app"><strong>Live Demo</strong></a>
  <br />
  <br />

  ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript&logoColor=white)
  ![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
  ![Turborepo](https://img.shields.io/badge/Turborepo-Enabled-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
</div>

---

## About Slyme

**Slyme**  is a hyperlocal social platform designed to gamify community action and environmental impact. By leveraging a real-time geospatial engine, it visualizes local activity to connect users with their immediate surroundings.

Whether it is coordinating an environmental drive, joining a location-based chat room, or picking up a local task for cash, Slyme bridges the gap between digital intent and real-world impact.

> **Status:** Public Beta (10+ active users)

---

## Interface Preview

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="./media/slyme.png" width="250" alt="Mobile View 1" /></td>
      <td align="center"><img src="./media/slyme0.png" width="250" alt="Mobile View 2" /></td>
      <td align="center"><img src="./media/slyme3.png" width="250" alt="Mobile View 4" /></td>
    </tr>
  </table>
</div>

---

## Key Features

* **Geospatial Engine:** Real-time visualization of active users, events, and tasks on the map.
* **Dynamic Rooms:** Geolocation-based chat rooms that unlock when you are in range.
* **'Gig' Marketplace:** A local feed for monetizing tasks (errands, help) and finding quick work.
* **Environmental Drives:** Tools to coordinate and track community cleanups and eco-initiatives.
* **Real-Time Feeds:** Shared community updates powered by WebSockets.

---

## Tech Stack

This project is a high-performance **Monorepo** built with **Turborepo** and **pnpm**.

### Frontend (`apps/web`)
A cutting-edge UI built for performance and smooth interactions.
* **Framework:** Next.js 16 (App Router) & React 19
* **Styling:** Tailwind CSS 4 & DaisyUI 5
* **State Management:** Jotai (Atomic state) & TanStack Query v5
* **Maps & Location:** `@react-google-maps/api` 
* **UX/Animations:** Framer Motion (v12)
* **Storage:** Dexie (IndexedDB wrapper)
* **Icons:** Lucide React

### Backend Infrastructure
A robust, decoupled Node.js architecture handling API requests and real-time events separately.

* **HTTP Service** (`apps/http-backend`):
    * **Runtime:** Node.js & Express 5
    * **Database:** PostgreSQL managed via Prisma ORM (v6.18)
    * **Storage:** Cloudinary (via Multer)
    * **Auth & Validation:** JSON Web Tokens (JWT) & Zod
* **WebSocket Service** (`apps/ws-backend`):
    * **Real-time:** Socket.io (realtime communication between rooms and network)
* **Media Service** (`apps/ws-backend(Under Construction)`):
    * **Experimental:** WebRTC implementation for voice comms

### DevOps & Tooling
* **Monorepo:** Turborepo (v2.5)
* **Package Manager:** pnpm (v9)
* **Language:** TypeScript (v5.9)

---

## Getting Started

### Prerequisites
* Node.js >= 18
* pnpm (`npm install -g pnpm`)


### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/dotbillu/Slyme.git](https://github.com/dotbillu/Slyme.git)
    cd Slyme
    ```

2.  **Install dependencies**
    ```bash
    pnpm i
    ```

3.  **Environment Setup**
    Navigate to each application directory (e.g., `apps/web`, `apps/http-backend`). You will find an `.env.example` file in each folder.
    * Copy the contents of `.env.example`.
    * Create a new file named `.env` in the same directory.
    * Paste the contents and fill in your specific credentials.

4.  **Database Migration**
    ```bash
    pnpm db:migrate
    ```

5.  **Run Development Server**
    This will start the Next.js frontend (port 3000) and Express backend (port 8080/default) concurrently using Turbo.
    ```bash
    pnpm dev
    ```

---

## Contributing

We are currently in **Beta** and actively re-architecting our security layer to include **End-to-End Encryption** .

If you want to contribute to the security overhaul, report bugs, or suggest features:
1.  Fork the repo.
2.  Create a feature branch.
3.  Submit a Pull Request.
---

## License

This project is licensed under the **ISC License**. See the [LICENSE](./LICENSE) file for details.
