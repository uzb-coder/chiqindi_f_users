import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const registerUser = async (req, res) => {
  try {
    const { ism, familya, login, parol ,rol} = req.body;

    if (!ism || !familya || !login || !parol || !rol) {
      return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring!" });
    }

    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return res.status(400).json({ message: "Bu login allaqachon mavjud!" });
    }

    const hashedPassword = await bcrypt.hash(parol, 10);

    const user = await User.create({
      ism,
      familya,
      login,
      parol: hashedPassword,
      rol
    });

    res.status(201).json({ message: "✅ Foydalanuvchi yaratildi", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { login, parol } = req.body;

    const user = await User.findOne({ login });
    if (!user) return res.status(404).json({ message: "Login topilmadi!" });

    const isMatch = await bcrypt.compare(parol, user.parol);
    if (!isMatch) return res.status(400).json({ message: "Parol noto‘g‘ri!" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "✅ Kirish muvaffaqiyatli!",
      token,
      user: {
        id: user._id,
        ism: user.ism,
        familya: user.familya,
        login: user.login,
        rol: user.rol
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-parol"); // parolni olib tashlaymiz
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

