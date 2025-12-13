import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import productRoutes from "./src/routes/productRoutes.js";
import saleRoutes from "./src/routes/saleRoutes.js";
import returnRoutes from "./src/routes/returnRoutes.js";
import clientRoutes from "./src/routes/clientRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import { protect } from "./src/middleware/authMiddleware.js";
import expenseRoutes from "./src/routes/expenseRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import invoiceRoutes from "./src/routes/invoiceRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "localhost";

app.use(express.json());
  
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB muvaffaqiyatli ulandi!");
    console.log("Ulanish URL:", process.env.MONGO_URI); 
  })
  .catch((err) => console.error("❌ MongoDB ulanishda xatolik:", err.message));

  console.log("Ulanish URL:", process.env.MONGO_URI);

app.use("/api/dashboard", protect, dashboardRoutes);

app.use("/api/invoices", protect, invoiceRoutes);

app.use("/api/products", protect, productRoutes);

app.use("/api/returns", protect, returnRoutes);

app.use("/api/sales", protect, saleRoutes);

app.use("/api/clients", protect, clientRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/users", userRoutes);

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server http://${HOST}:${PORT} da ishlayapti`);
});
