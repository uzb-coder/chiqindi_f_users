import express from "express";
import { getProducts, createProduct,deleteProduct, updateProduct, getCategories } from "../controllers/productController.js";
import { setDollarRate, getDollarRate } from "../controllers/exchangeRateController.js";


const router = express.Router();

router.get("/", getProducts);
router.get("/category", getCategories);
router.post("/create", createProduct);
router.delete("/delete/:id", deleteProduct);
router.put("/:id",updateProduct);

// Dollar kursi
router.post("/exchange-rate", setDollarRate);
router.get("/exchange-rate", getDollarRate);

export default router;
