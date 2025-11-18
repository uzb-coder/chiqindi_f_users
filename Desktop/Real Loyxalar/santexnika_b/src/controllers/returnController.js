import Return from "../models/ReturnProduc.js";
import Product from "../models/Product.js";

// 1. Qaytarilgan mahsulot yaratish
export const createReturn = async (req, res) => {
  try {
    const { productId, miqdor, sababi } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    const returned = new Return({
      product: productId,
      miqdor,
      sababi,
      status: "pending"
    });

    await returned.save();
    res.status(201).json({ message: "Mahsulot qaytarildi, tasdiqlash kutilmoqda", returned });
  } catch (error) {
    res.status(500).json({ message: "Xatolik", error: error.message });
  }
};

// 2. Faqat hali tasdiqlanmagan (pending) qaytgan mahsulotlarni olish
export const getReturns = async (req, res) => {
  try {
    const returns = await Return.find({ status: { $ne: "confirmed" } }) // ❗ faqat "pending" yoki boshqalar
      .populate("product", "nomi narxi birligi")
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (error) {
    res.status(500).json({
      message: "Qaytarilgan mahsulotlarni olishda xatolik",
      error: error.message
    });
  }
};


// Omborga qaytgan (tasdiqlangan) mahsulotlarni olish
export const getConfirmedReturns = async (req, res) => {
  try {
    const confirmedReturns = await Return.find({ status: "confirmed" })
      .populate("product", "nomi narxi birligi")
      .sort({ updatedAt: -1 }); // eng oxirgi tasdiqlanganlar oldinda bo‘ladi

    res.json(confirmedReturns);
  } catch (error) {
    res.status(500).json({ message: "Omborga qaytgan mahsulotlarni olishda xatolik", error: error.message });
  }
};

// 2. Qaytarishni tasdiqlash (UI tugmasi bosilganda)
export const confirmReturn = async (req, res) => {
  try {
    const { returnIds } = req.body; // [{id1}, {id2}, {id3}] yoki ["id1","id2"]

    if (!returnIds || !Array.isArray(returnIds) || returnIds.length === 0) {
      return res.status(400).json({ message: "returnIds massivini yuboring" });
    }

    const results = [];

    for (const id of returnIds) {
      const returned = await Return.findById(id).populate("product");
      if (!returned) continue; // topilmagan bo‘lsa tashlab ketamiz

      const product = returned.product;
      product.ombordagi_soni += returned.miqdor;
      await product.save();

      returned.status = "confirmed";
      await returned.save();

      results.push({
        product: product.nomi,
        qaytgan_miqdor: returned.miqdor,
        yangi_ombor_soni: product.ombordagi_soni,
      });
    }

    res.json({
      message: "Barcha mahsulotlar omborga qaytarildi",
      results,
    });
  } catch (error) {
    res.status(500).json({ message: "Tasdiqlashda xatolik", error: error.message });
  }
};

// 🔹 Qaytarilgan mahsulotlar statistikasi (hafta, oy, yil bo‘yicha)
export const getReturnStats = async (req, res) => {
  try {
    const returns = await Return.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$sana" },
            month: { $month: "$sana" },
            week: { $week: "$sana" }
          },
          totalReturned: { $sum: "$qaytgan_miqdor" },
          totalItems: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.week": -1 } }
    ]);

    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: "Statistika olishda xatolik", error: error.message });
  }
};
