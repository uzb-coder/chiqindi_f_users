import express from "express";
import { createSale, previewSale, getSales, payDebt, getDebtClients, getAllDebtClientsSimple, } from "../controllers/saleController.js";

const router = express.Router();

router.get("/", getSales);

router.post("/create", createSale);

router.post("/preview", previewSale);

router.post("/debt/pay", payDebt);

router.get("/debts", getDebtClients);

router.get("/debts/all", getAllDebtClientsSimple);


export default router;
