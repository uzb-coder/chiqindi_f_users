// models/DashboardModel.js
import mongoose from "mongoose";

const dashboardSchema = new mongoose.Schema({
  overview: { type: Object },
  sales: { type: Object },
  products: { type: Object },
  clients: { type: Object },
  expenses: { type: Object },
  returns: { type: Object },
  invoices: { type: Object },
  financial: { type: Object },
  recordKey: { type: String, unique: true }, // dublicate bo‘lmasligi uchun
}, { timestamps: true });

// Eski model mavjud bo‘lsa uni ishlat, yo‘q bo‘lsa yarat
const Dashboard = mongoose.models.Dashboard || mongoose.model("Dashboard", dashboardSchema, "dashboards");

export default Dashboard;
