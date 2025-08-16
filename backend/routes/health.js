import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is online 🚀",
    timestamp: new Date(),
  });
});

export default router;
