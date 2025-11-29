import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Client from "../models/clientModel.js";

// Mijozni ro‘yxatdan o‘tkazish (parolsiz) + MANZIL qo'shildi
export const registerClient = async (req, res) => {
  try {
    const { ism, tel, manzil, promo_kod, foiz } = req.body;

    if (!ism || !tel) {
      return res.status(400).json({ 
        message: "Ism va telefon raqamini kiriting!" 
      });
    }

    const existingClient = await Client.findOne({ tel });
    if (existingClient) {
      return res.status(400).json({ 
        message: "Bu telefon raqam allaqachon ro‘yxatdan o‘tgan!" 
      });
    }

    const client = await Client.create({
      ism,
      tel,
      manzil,                    // Yangi maydon
      promo_kod,
      foiz: foiz || 0,
    });

    res.status(201).json({ 
      message: "Mijoz muvaffaqiyatli ro‘yxatdan o‘tdi", 
      client 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Xatolik yuz berdi", 
      error: error.message 
    });
  }
};

// Barcha mijozlarni olish
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find().select("ism tel manzil promo_kod foiz");
    res.json({
      message: "Barcha mijozlar ro‘yxati",
      count: clients.length,
      clients,
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Ma'lumotlarni olishda xatolik", 
      error: error.message 
    });
  }
};

// Promo kod orqali mijozni topish
export const getClientByPromo = async (req, res) => {
  try {
    const { promo_kod } = req.params;

    const client = await Client.findOne({ promo_kod }).select("ism telefon manzil promo_kod foiz");
    if (!client) {
      return res.status(404).json({ 
        message: "Promo kod bo‘yicha mijoz topilmadi!" 
      });
    }

    res.json({
      message: "Mijoz topildi!",
      client,
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Ma'lumotni olishda xatolik", 
      error: error.message 
    });
  }
};

// Mijozni o‘chirish (o‘zgarmadi)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByIdAndDelete(id);

    if (!client) {
      return res.status(404).json({ message: "Mijoz topilmadi!" });
    }

    res.json({ message: "Mijoz muvaffaqiyatli o‘chirildi!" });
  } catch (error) {
    res.status(500).json({ 
      message: "O‘chirishda xatolik", 
      error: error.message 
    });
  }
};

// Mijozni yangilash + MANZIL qo'shildi
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { ism, tel, manzil, promo_kod, foiz } = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { 
        ism, 
        tel, 
        manzil,           // Yangi maydon qo'shildi
        promo_kod, 
        foiz 
      },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Mijoz topilmadi!" });
    }

    res.json({
      message: "Mijoz ma'lumotlari yangilandi!",
      client: updatedClient,
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Yangilashda xatolik", 
      error: error.message 
    });
  }
};