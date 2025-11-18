import express from "express";
import { getProducts, createProduct,deleteProduct, updateProduct } from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);

router.post("/create", createProduct);

router.delete("/delete/:id", deleteProduct);

router.put("/:id",updateProduct);

export default router;
