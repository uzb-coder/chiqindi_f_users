import Product from "../models/Product.js";
import ProductHistory from "../models/ProductHistoryModel.js";

export const getProducts = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search?.trim() || "";

    let filter = {};

    if (search) {
      filter = {
        $or: [
          { nomi: { $regex: search, $options: "i" } },
          { birligi: { $regex: search, $options: "i" } },
          { valyuta: { $regex: search, $options: "i" } },

          // Son bo‘lsa raqam bo‘yicha qidirish
          ...(Number(search)
            ? [
                { narxi: Number(search) },
                { tannarxi: Number(search) }
              ]
            : [])
        ]
      };
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      limit,
      total,
      totalPages,
      products,
    });

  } catch (err) {
    console.log("❌ Error:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};


// 🔹 Mahsulot yaratish
export const createProduct = async (req, res) => {
  try {
    const { nomi, valyuta, narxi, birligi, ombordagi_soni,tannarxi } = req.body;

    const product = await Product.create({
      nomi,
      valyuta: valyuta || "UZS",
      narxi,
      birligi,
      ombordagi_soni,
      tannarxi
    });

    res.status(201).json({
      message: "Mahsulot yaratildi",
      product,
    });
  } catch (error) {
    console.error("❌ Mahsulot yaratishda xato:", error);
    res.status(500).json({
      message: "Mahsulot yaratishda xatolik",
      error: error.message,
    });
  }
};

// 🔹 Mahsulotni o‘chirish
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Mahsulot topilmadi" });
    }

    res.json({
      message: "Mahsulot muvaffaqiyatli o‘chirildi",
      product: deletedProduct,
    });
  } catch (error) {
    console.error("❌ Mahsulotni o‘chirishda xato:", error);
    res.status(500).json({ message: "Mahsulotni o‘chirishda xatolik", error: error.message });
  }
};

// 🔹 Mahsulotni yangilash
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nomi, narxi, birligi, qoshilgan_soni, valyuta,tannarxi } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    const oldQuantity = product.ombordagi_soni;

    // Ombordagi sonni yangilash
    if (qoshilgan_soni) product.ombordagi_soni += qoshilgan_soni;

    // Maydonlarni yangilash
    if (nomi) product.nomi = nomi;
    if (narxi) product.narxi = narxi;
    if (birligi) product.birligi = birligi;
    if (valyuta) product.valyuta = valyuta;
    if (valyuta) product.tannarxi= tannarxi;

    await product.save();

    // Yangilanish tarixini saqlash
    if (qoshilgan_soni) {
      await ProductHistory.create({
        product: product._id,
        oldQuantity,
        addedQuantity: qoshilgan_soni,
        newQuantity: product.ombordagi_soni,
        updatedAt: new Date(),
      });
    }

    res.status(200).json({
      message: "Mahsulot yangilandi",
      product: {
        ...product.toObject(),
        valyuta: product.valyuta || "UZS",
      },
    });
  } catch (error) {
    console.error("❌ Mahsulotni yangilashda xato:", error);
    res.status(500).json({ message: "Mahsulotni yangilashda xatolik", error: error.message });
  }
};
