import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import { login, register } from "./auth.controller.js";
import { me } from "./auth.protected.controller.js";
import { refresh } from "./auth.refresh.controller.js";
import { logout } from "./auth.logout.controller.js";

const router = Router();

router.post("/refresh", refresh);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", authenticate, me);

export { router as authRouter };
