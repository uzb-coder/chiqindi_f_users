import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token topilmadi!" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-parol");

    next();
  } catch (error) {
    res.status(401).json({ message: "Noto‘g‘ri yoki muddati o‘tgan token!" });
  }
};
