import Product from "../models/Product.js";
import ProductHistory from "../models/ProductHistoryModel.js";
import ExchangeRate from '../models/ExchangeRate.js'; 
import Category from "../models/categroyaModel.js";

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
          ...(Number(search) ? [{ narxi: Number(search) }, { tannarxi: Number(search) }] : []),
        ],
      };
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    if (page > totalPages && totalPages > 0) page = totalPages;
    const skip = (page - 1) * limit;

    // Mahsulotlarni olib kelish va category nomini olish
    let products = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'categorya',  
        select: 'name'
      });

    products = products.map(p => {
      return {
        ...p.toObject(),
        categoryName: p.categorya?.name || "", 
        categorya: p.categorya?._id || null    
      };
    });

    res.json({
      page,
      limit,
      total,
      totalPages,
      products
    });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    res.json({
      total: categories.length,
      categories
    });
  } catch (error) {
    res.status(500).json({
      message: "Categorylarni olishda xatolik",
      error: error.message
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      nomi,
      valyuta,
      narxi,
      birligi,
      ombordagi_soni,
      tannarxi,
      categoryName
    } = req.body;

    if (!categoryName || categoryName.trim() === "") {
      return res.status(400).json({
        message: "Category nomi majburiy"
      });
    }

    // 🔹 1. Category ni topamiz
    let category = await Category.findOne({ name: categoryName });

    // 🔹 2. Agar topilmasa — yaratamiz
    if (!category) {
      category = await Category.create({
        name: categoryName
      });
    }

    // 🔹 3. Mahsulot yaratamiz
    const product = await Product.create({
      nomi,
      valyuta: valyuta || "UZS",
      narxi,
      birligi,
      ombordagi_soni,
      tannarxi,
      categorya: category._id
    });

    res.status(201).json({
      message: "Mahsulot yaratildi",
      product
    });

  } catch (error) {
    console.error("❌ Mahsulot yaratishda xato:", error);
    res.status(500).json({
      message: "Mahsulot yaratishda xatolik",
      error: error.message
    });
  }
};

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

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nomi,
      narxi,
      birligi,
      qoshilgan_soni,
      valyuta,
      tannarxi,
      categoryName
    } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

    // 🔹 Category bilan ishlash (yangi yaratish yoki tanlash)
    let category = null;
    if (categoryName) {
      category = await Category.findOne({ name: categoryName });
      if (!category) {
        category = await Category.create({ name: categoryName });
      }
      product.categorya = category._id;
    }

    const oldQuantity = product.ombordagi_soni;

    // Ombordagi sonni yangilash
    if (qoshilgan_soni) product.ombordagi_soni += qoshilgan_soni;

    // Maydonlarni yangilash
    if (nomi) product.nomi = nomi;
    if (narxi) product.narxi = narxi;          // sotish narxi (UZS)
    if (birligi) product.birligi = birligi;
    if (valyuta) product.valyuta = valyuta;    // tannarxi valyutasi
    if (tannarxi) product.tannarxi = tannarxi; // tan narxi (USD)

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
        valyuta: product.valyuta || "USD",
      },
    });
  } catch (error) {
    console.error("❌ Mahsulotni yangilashda xato:", error);
    res.status(500).json({
      message: "Mahsulotni yangilashda xatolik",
      error: error.message
    });
  }
};
