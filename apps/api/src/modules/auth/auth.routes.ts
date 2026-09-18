import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import { rateLimit } from "../../common/middleware/rate-limit.middleware.js";
import { login, register } from "./auth.controller.js";
import { me } from "./auth.protected.controller.js";
import { refresh } from "./auth.refresh.controller.js";
import { logout } from "./auth.logout.controller.js";

const router = Router();

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 20,
  message: "Too many login attempts, please try again later",
});

const registerLimiter = rateLimit({
  windowMs: ONE_HOUR,
  max: 20,
  message: "Too many accounts created, please try again later",
});

router.post("/refresh", refresh);
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);

router.get("/me", authenticate, me);

export { router as authRouter };
