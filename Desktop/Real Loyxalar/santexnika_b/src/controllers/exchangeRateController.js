import ExchangeRate from "../models/ExchangeRate.js";

// 🔹 Dollar kursini saqlash
export const setDollarRate = async (req, res) => {
  try {
    const { usd } = req.body;
    if (!usd) return res.status(400).json({ message: "Dollar kursini kiriting!" });

    // Yangi kursni saqlash
    const rate = await ExchangeRate.create({ usd });
    res.status(201).json({ message: "Dollar kursi saqlandi", rate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// 🔹 Oxirgi dollar kursini olish
export const getDollarRate = async (req, res) => {
    try {
      // Oxirgi yangilangan kursni olish
      const rate = await ExchangeRate.findOne().sort({ updatedAt: -1 });
  
      res.json({
        usd: rate ? rate.usd : 0,
        updatedAt: rate ? rate.updatedAt : null // kurs yaratilgan sana
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server xatosi" });
    }
  };
  