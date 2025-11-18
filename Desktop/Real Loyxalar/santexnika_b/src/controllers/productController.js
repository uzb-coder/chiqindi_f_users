import Product from "../models/Product.js";
import ProductHistory from "../models/ProductHistoryModel.js";

// 🔹 Mahsulotlarni olish
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();

    // Valyutani har doim qo‘shib berish
    const populatedProducts = products.map(p => ({
      ...p.toObject(),
      valyuta: p.valyuta || "UZS",
    }));

    res.json(populatedProducts);
  } catch (error) {
    console.error("❌ Mahsulotlarni olishda xato:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 Mahsulot yaratish
export const createProduct = async (req, res) => {
  try {
    const { nomi, valyuta, narxi, birligi, ombordagi_soni } = req.body;

    const product = await Product.create({
      nomi,
      valyuta: valyuta || "UZS",
      narxi,
      birligi,
      ombordagi_soni,
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
    const { nomi, narxi, birligi, qoshilgan_soni, valyuta } = req.body;

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
