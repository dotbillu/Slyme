# Slyme

<div align="center">
  <img src="./media/slymelogo.png" alt="Slyme Logo" width="120" height="120" />
  <br />
  <h3>Hyperlocal Social Action & Community Gamification</h3>
  <p>
    <b>Connect locally. Act globally.</b>
  </p>
  
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

**Slyme** (Internal Code: *EcoSphere*) is a hyperlocal social platform designed to gamify community action and environmental impact. By leveraging a real-time geospatial engine, it visualizes local activity to connect users with their immediate surroundings.

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
    * **Real-time:** Socket.io (Handling geospatial updates & room chats)
* **Media Service** (`apps/ws-backend(Under Construction)`):
    * **Experimental:** WebRTC implementation for voice

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

We are currently in **Beta**. If you find bugs or want to suggest features:
1.  Fork the repo.
2.  Create a feature branch.
3.  Submit a Pull Request.

---

## License

ISC License.