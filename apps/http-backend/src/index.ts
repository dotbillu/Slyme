import express from "express";
import cors from "cors";
import userRoutes from "./routes/user";
import postRoutes from "@posts";
import mapRoutes from "@maps";
import searchRoutes from "./routes/search";
import globalRoutes from "./routes/global";
import chatRoutes from "@chats";
require("dotenv").config();

const app = express();
const PORT = process.env.HTTP_PORT || 3002;
const SELF_URL = process.env.SERVER_LINK || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);
app.use("/feed", postRoutes);
app.use("/map", mapRoutes);
app.use("/search", searchRoutes);
app.use("/global", globalRoutes);
app.use("/chat", chatRoutes);

app.get("/activate", (req, res) => {
  res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);

  if (process.env.NODE_ENV === "production" && SELF_URL) {
    console.log(`Setting up keep-alive ping for ${SELF_URL}`);
    setInterval(
      async () => {
        try {
          console.log(`Sending keep-alive ping to ${SELF_URL}/activate`);
          const response = await fetch(`${SELF_URL}/activate`);
          if (response.ok) {
            console.log("Keep-alive ping successful");
          } else {
            console.warn(
              "Keep-alive ping returned bad status:",
              response.status
            );
          }
        } catch (error) {
          console.error("Keep-alive ping failed:", error);
        }
      },
      14 * 60 * 1000
    );
  }
});
