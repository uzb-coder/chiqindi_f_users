// routes/debtRoutes.js
import express from "express";
import {
  payDebtForSale,
  getDebtPaymentHistory,
  getAllDebtClientsDetailed,
  getClientDebtDetails
} from "../controllers/DebtController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 1. Qarzni to'lash - har bir sale uchun alohida
router.post("/pay", protect, payDebtForSale);

// 2. To'langan qarzlar tarixi
router.get("/payment-history", protect, getDebtPaymentHistory);

// 3. Barcha qarzdorlar - to'liq ma'lumot
router.get("/clients", protect, getAllDebtClientsDetailed);

// 4. Bitta mijozning to'liq ma'lumoti
router.get("/client/:clientId", protect, getClientDebtDetails);

export default router;