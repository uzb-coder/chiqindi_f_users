import express from "express";
import {
  createExpense,
  getExpenses,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

router.post("/", createExpense);     // ➕ Harajat qo‘shish
router.get("/", getExpenses);        // 📋 Barcha harajatlarni olish
router.delete("/:id", deleteExpense); // ❌ Harajatni o‘chirish

export default router;
