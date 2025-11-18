import express from "express";
import { getInvoiceByClient,getInvoiceBySale} from "../controllers/invoiceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.get("/:saleId", protect, getInvoice);

router.get("/by-client/:clientId", protect, getInvoiceByClient);

router.get("/sale/:saleId", getInvoiceBySale);

export default router;
