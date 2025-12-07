import { Router } from "express";
import { prisma } from "@lib/prisma";
import authsignin from "./signin";
import type { Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();

router.use("/signin", authsignin);
export default router;
