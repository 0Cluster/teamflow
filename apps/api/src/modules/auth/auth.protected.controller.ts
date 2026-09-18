import type { Request, Response } from "express";

export function me(req: Request, res: Response): void {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}
