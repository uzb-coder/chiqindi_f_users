// controllers/returnController.js
import Return from "../models/ReturnProduc.js";
import Product from "../models/Product.js";

// 1. YANGI QAYTARISH YARATISH (ko‘p mahsulot birda)
export const createReturn = async (req, res) => {
  try {
    const { products, umumiyIzoh } = req.body;

    // Validatsiya
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Mahsulotlar ro‘yxati (products) bo‘sh yoki noto‘g‘ri formatda",
      });
    }

    const productDetails = [];

    for (const item of products) {
      const { productId, miqdor, sababi } = item;

      if (!productId || miqdor == null || !sababi) {
        return res.status(400).json({
          message: "Har bir mahsulot uchun productId, miqdor va sababi talab qilinadi",
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          message: `Mahsulot topilmadi: ${productId}`,
        });
      }

      // Numberga o‘tkazamiz (frontenddan string kelishi mumkin)
      const parsedMiqdor = parseFloat(miqdor);
      if (isNaN(parsedMiqdor) || parsedMiqdor <= 0) {
        return res.status(400).json({
          message: `Noto‘g‘ri miqdor: ${miqdor} (mahsulot: ${product.nomi})`,
        });
      }

      productDetails.push({
        product: productId,
        miqdor: parsedMiqdor,
        sababi: sababi.trim(),
      });
    }

    const newReturn = new Return({
      productDetails,
      umumiyIzoh: umumiyIzoh?.trim() || "",
      status: "pending",
    });

    await newReturn.save();

    // Populate qilib, chiroyli javob qaytaramiz
    const populatedReturn = await Return.findById(newReturn._id).populate(
      "productDetails.product",
      "nomi narxi birligi"
    );

    res.status(201).json({
      message: "Qaytarish muvaffaqiyatli yaratildi",
      returned: populatedReturn,
    });
  } catch (error) {
    console.error("CreateReturn xatosi:", error);
    res.status(500).json({
      message: "Server xatosi",
      error: error.message,
    });
  }
};

// 2. Pending qaytarishlarni olish
export const getReturns = async (req, res) => {
  try {
    const returns = await Return.find({ status: "pending" })
      .populate("productDetails.product", "nomi narxi birligi")
      .sort({ createdAt: -1 })
      .lean();

    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ma’lumotlarni olishda xatolik" });
  }
};

// 3. Tasdiqlanganlarni olish
export const getConfirmedReturns = async (req, res) => {
  try {
    const returns = await Return.find({ status: "confirmed" })
      .populate("productDetails.product", "nomi narxi birligi")
      .sort({ updatedAt: -1 })
      .lean();

    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ma’lumotlarni olishda xatolik" });
  }
};

// 4. Bir nechta qaytarishni tasdiqlash (omborga qaytarish)
export const confirmReturn = async (req, res) => {
  try {
    const { returnIds } = req.body;

    if (!returnIds || !Array.isArray(returnIds) || returnIds.length === 0) {
      return res.status(400).json({ message: "returnIds massivi bo‘sh" });
    }

    const results = [];

    for (const id of returnIds) {
      const returnDoc = await Return.findById(id).populate("productDetails.product");
      if (!returnDoc || returnDoc.status === "confirmed") continue;

      for (const detail of returnDoc.productDetails) {
        const product = detail.product;
        if (product) {
          product.ombordagi_soni += detail.miqdor;
          await product.save();

          results.push({
            product: product.nomi,
            qaytgan_miqdor: detail.miqdor,
            yangi_ombor_soni: product.ombordagi_soni,
          });
        }
      }

      returnDoc.status = "confirmed";
      await returnDoc.save();
    }

    res.json({
      message: `${results.length} ta mahsulot omborga qaytarildi`,
      results,
    });
  } catch (error) {
    console.error("Confirm error:", error);
    res.status(500).json({ message: "Tasdiqlashda xatolik", error: error.message });
  }
};

// 5. Statistika
export const getReturnStats = async (req, res) => {
  try {
    const stats = await Return.aggregate([
      { $match: { status: "confirmed" } },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalMiqdor: { $sum: "$productDetails.miqdor" },
          totalItems: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
    ]);

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Statistika xatosi" });
  }
};