import Expense from "../models/Expense.js";

// 🔹 Yangi harajat qo‘shish
export const createExpense = async (req, res) => {
  try {
    const { nomi, summa, izoh } = req.body;

    if (!nomi || !summa) {
      return res.status(400).json({ message: "Harajat nomi va summasi kerak!" });
    }

    const expense = await Expense.create({ nomi, summa, izoh });
    res.status(201).json({ message: "✅ Harajat qo‘shildi", expense });
  } catch (error) {
    res.status(500).json({ message: "Harajat qo‘shishda xatolik", error: error.message });
  }
};

// 🔹 Barcha harajatlarni olish
export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Harajatlarni olishda xatolik", error: error.message });
  }
};

// 🔹 Harajatni o‘chirish
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await Expense.findByIdAndDelete(id);
    res.json({ message: "🗑️ Harajat o‘chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Harajatni o‘chirishda xatolik", error: error.message });
  }
};
