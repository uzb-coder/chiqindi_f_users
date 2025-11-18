// routes/dashboardRouter.js yoki statsRouter.js

import express from "express";
import Product from "../models/Product.js";
import Client from "../models/clientModel.js";
import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import Return from "../models/ReturnProduc.js";
import User from "../models/userModel.js";
import Invoice from "../models/invoiceModel.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const EXCHANGE_RATE = 12800;

const convert = (amount, from = "UZS", to = "UZS") => {
  if (from === to) return Number(amount) || 0;
  if (from === "USD" && to === "UZS") return (Number(amount) || 0) * EXCHANGE_RATE;
  if (from === "UZS" && to === "USD") return (Number(amount) || 0) / EXCHANGE_RATE;
  return Number(amount) || 0;
};

router.get("/summary", protect, async (req, res) => {
  try {
    const { currency = "UZS" } = req.query;
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      productCount, clientCount, userCount,
      sales, expenses, returns, invoicesRaw,
      lowStock
    ] = await Promise.all([
      Product.countDocuments(),
      Client.countDocuments(),
      User.countDocuments(),
      Sale.find().populate("client", "name").lean(),
      Expense.find().lean(),
      Return.find().lean(),
      Invoice.find().populate("client", "name").lean(),
      Product.find({ $or: [{ quantity: { $lte: 5 } }, { miqdor: { $lte: 5 }} ] }).limit(10).lean()
    ]);

    // ========== QARZ HISOBLASH (IKKALA TUR HAM) ==========
    let totalDebt = 0;
    let debtFromSales = 0;
    let debtFromInvoices = 0;
    const debtorsMap = {};

    // 1. Oddiy sotuvlarda qarz
    sales.forEach(sale => {
      const payment = (sale.paymentMethod || sale.tolovTuri || "").toLowerCase();
      const isDebt = ["debt", "qarz", "nasiya"].includes(payment);
      const alreadyPaid = sale.paid === true || sale.tolovHolati === "to'langan";

      if (isDebt && !alreadyPaid) {
        const amount = convert(sale.total || sale.totalPrice || sale.summa || 0, sale.currency || sale.valyuta, currency);
        totalDebt += amount;
        debtFromSales++;
        const client = sale.client?.name || sale.clientName || sale.mijoz || "Noma'lum";
        debtorsMap[client] = (debtorsMap[client] || 0) + amount;
      }
    });

    // 2. Hisob-fakturalarda qarz
    invoicesRaw.forEach(inv => {
      const amount = convert(inv.totalAmount || inv.total || inv.summa || 0, inv.currency || inv.valyuta, currency);
      const paid = inv.status === "paid" || inv.holat === "to'langan" || inv.holat === "to‘langan";
      if (!paid) {
        totalDebt += amount;
        debtFromInvoices++;
        const client = inv.client?.name || inv.clientName || inv.mijoz || "Noma'lum";
        debtorsMap[client] = (debtorsMap[client] || 0) + amount;
      }
    });

    const topDebtors = Object.keys(debtorsMap)
      .map(name => ({ name, debt: Math.round(debtorsMap[name]) }))
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 10);

    // ========== SOTUVLAR HISOBI ==========
    const filterByDate = (list, dateField = "createdAt", start) =>
      list.filter(i => {
        const d = i[dateField] || i.sana || i.date || i.createdAt;
        return d && new Date(d) >= start;
      });

    const calc = (list) => {
      let sum = 0, count = 0;
      list.forEach(s => {
        sum += convert(s.total || s.totalPrice || s.summa || 0, s.currency || s.valyuta, currency);
        count++;
      });
      return { sales: Math.round(sum), orders: count };
    };

    const today = calc(filterByDate(sales, "date", startOfDay));
    const week  = calc(filterByDate(sales, "date", startOfWeek));
    const month = calc(filterByDate(sales, "date", startOfMonth));
    const year  = calc(filterByDate(sales, "date", startOfYear));
    const all   = calc(sales);

    // ========== XARAJAT + QAYTARUV ==========
    const totalExpense = Math.round(expenses.reduce((s, e) => s + convert(e.amount || e.summa || 0, e.currency || e.valyuta, currency), 0));
    const totalReturn  = Math.round(returns.reduce((s, r) => s + convert(r.totalAmount || r.summa || 0, r.currency || r.valyuta, currency), 0));

    const netProfit = all.sales - totalExpense - totalReturn;

    // ========== JAVOB ==========
    res.json({
      currency,
      exchangeRate: EXCHANGE_RATE,
      generatedAt: new Date().toISOString(),

      counts: {
        products: productCount,
        clients: clientCount,
        users: userCount,
        sales: sales.length,
        expenses: expenses.length,
        returns: returns.length,
        invoices: invoicesRaw.length
      },

      financial: {
        totalSales: all.sales,
        totalExpenses: totalExpense,
        totalReturns: totalReturn,
        netProfit: Math.round(netProfit),
        profitMargin: all.sales > 0 ? ((netProfit / all.sales) * 100).toFixed(2) : "0.00"
      },

      debt: {
        totalDebt: Math.round(totalDebt),
        fromSales: debtFromSales,
        fromInvoices: debtFromInvoices,
        totalDebtors: debtFromSales + debtFromInvoices,
        percentage: all.sales > 0 ? ((totalDebt / all.sales) * 100).toFixed(1) : "0.0",
        topDebtors
      },

      periods: {
        today: today,
        thisWeek: week,
        thisMonth: month,
        thisYear: year,
        allTime: all
      },

      lowStock: lowStock.map(p => ({
        id: p._id,
        name: p.name || p.nomi,
        quantity: p.quantity || p.miqdor || 0,
        price: p.price || p.narx || 0
      }))
    });

  } catch (err) {
    console.error("Dashboard xatosi:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
});

export default router;