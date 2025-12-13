// routes/return.js
import express from "express";
import {
  createReturn,
  getReturns,
  getConfirmedReturns,
  confirmReturn,
  getReturnStats,
} from "../controllers/returnController.js";

const router = express.Router();

// Pending qaytarishlar (admin ko‘radi)
router.get("/pending", getReturns);

// Tasdiqlanganlar
router.get("/confirmed", getConfirmedReturns);

// Yangi qaytarish yaratish
router.post("/create", createReturn);

// Bir nechta qaytarishni tasdiqlash
router.put("/confirm", confirmReturn);

// Statistika
router.get("/stats", getReturnStats);

export default router;