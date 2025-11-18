import Category from "../models/Category.js";


// 🔹 Barcha kategoriyalarni olish
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};


// 🔹 Yangi kategoriya yaratish
export const createCategory = async (req, res) => {
  try {
    let { nomi, subcategories } = req.body;

    // ⚙️ Agar subcategories string bo‘lsa (masalan: "metall,plastik")
    if (typeof subcategories === "string" && subcategories.trim() !== "") {
      subcategories = subcategories
        .split(",")
        .map((name) => ({ nomi: name.trim() }))
        .filter((s) => s.nomi.length > 0);
    } 
    // ⚙️ Agar u massiv bo‘lsa
    else if (Array.isArray(subcategories)) {
      subcategories = subcategories.map((s) =>
        typeof s === "string" ? { nomi: s.trim() } : s
      );
    } else {
      subcategories = [];
    }

    // 🔹 Tekshiruv: nomi mavjud bo‘lmasin
    const existing = await Category.findOne({ nomi });
    if (existing) {
      return res.status(400).json({ message: "Bunday kategoriya allaqachon mavjud!" });
    }

    const newCategory = new Category({ nomi, subcategories });
    await newCategory.save();

    res.status(201).json({
      message: "Kategoriya yaratildi ✅",
      category: newCategory,
    });
  } catch (error) {
    console.error("❌ Kategoriya yaratishda xato:", error);
    res.status(500).json({
      message: "Kategoriya yaratishda xatolik",
      error: error.message,
    });
  }
};


// 🔹 Kategoriya yangilash
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let { nomi, subcategories } = req.body;

    // ⚙️ Subkategoriya string bo‘lsa — massivga aylantiramiz
    if (typeof subcategories === "string" && subcategories.trim() !== "") {
      subcategories = subcategories
        .split(",")
        .map((name) => ({ nomi: name.trim() }))
        .filter((s) => s.nomi.length > 0);
    } else if (Array.isArray(subcategories)) {
      subcategories = subcategories.map((s) =>
        typeof s === "string" ? { nomi: s.trim() } : s
      );
    } else {
      subcategories = [];
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { nomi, subcategories },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Kategoriya topilmadi!" });
    }

    res.json({
      message: "Kategoriya muvaffaqiyatli yangilandi ✅",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("❌ Kategoriya yangilashda xato:", error);
    res.status(500).json({
      message: "Kategoriya yangilashda xatolik",
      error: error.message,
    });
  }
};


// 🔹 Kategoriya o‘chirish
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Kategoriya topilmadi!" });
    }

    res.json({
      message: "Kategoriya muvaffaqiyatli o‘chirildi 🗑️",
      category: deleted,
    });
  } catch (error) {
    console.error("❌ Kategoriya o‘chirishda xato:", error);
    res.status(500).json({
      message: "Kategoriya o‘chirishda xatolik",
      error: error.message,
    });
  }
};
