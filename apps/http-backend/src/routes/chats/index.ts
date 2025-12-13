
import { Router } from "express";
import groupMessages from "./groupMessages";
import directMessages from "./directMessages";

import type { Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();

router.use("/room", groupMessages); 
router.use("/dm", directMessages);

export default router;
