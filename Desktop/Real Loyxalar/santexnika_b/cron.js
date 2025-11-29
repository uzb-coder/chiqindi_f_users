// // cron.js
// import cron from "node-cron";
// import axios from "axios";
// import mongoose from "mongoose";
// import Dashboard from "./src/models/dashboardModel.js"; // Modelni import qilamiz

// // MongoDB Atlas ulanish URL
// const ATLAS_URI = "mongodb+srv://yoshxaker004_db_user:1920@cluster0.njbql0f.mongodb.net/santexnika";

// // 1️⃣ Mongoose connectionni bir marta ochamiz
// mongoose.connect(ATLAS_URI)
//   .then(() => console.log("MongoDB Atlas ulanishi ochildi"))
//   .catch(err => console.error("MongoDB ulanish xatosi:", err));

// // 2️⃣ Cron job: har 1 daqiqa
// cron.schedule("* * * * *", async () => {
//   try {
//     console.log("Dashboard ma'lumotlarini yuborish boshlanmoqda:", new Date());

//     // ✅ Avtomatik login qilish
//     const loginResponse = await axios.post("http://localhost:5000/api/users/login", {
//       login: "1",   // admin login
//       parol: "1"    // admin parol
//     });

//     const token = loginResponse.data.token;
//     if (!token) throw new Error("Token topilmadi!");

//     // ✅ Oxirgi 30 kun uchun startDate va endDate
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(endDate.getDate() - 30);

//     // ✅ Dashboard ma'lumotlarini olish
//     const dashboardResponse = await axios.get("http://localhost:5000/api/dashboard/stats", {
//       params: {
//         startDate: startDate.toISOString(),
//         endDate: endDate.toISOString()
//       },
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });

//     const data = dashboardResponse.data.data;

//     // ✅ Unique key qo‘shamiz (startDate + endDate)
//     const recordKey = `${startDate.toISOString()}_${endDate.toISOString()}`;
//     const exists = await Dashboard.findOne({ recordKey });

//     if (!exists) {
//       // Faqat yangi ma’lumot bo‘lsa saqlaymiz
//       const newRecord = new Dashboard({ ...data, recordKey });
//       await newRecord.save();
//       console.log("Yangi ma'lumot Atlas ga saqlandi!");
//     } else {
//       console.log("Ma'lumot allaqachon mavjud, saqlanmadi.");
//     }

//   } catch (err) {
//     console.error("Cron job xatolik:", err.message);
//   }
// });
