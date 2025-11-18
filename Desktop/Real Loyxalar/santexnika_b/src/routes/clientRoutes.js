import express from "express";
import { registerClient, deleteClient, updateClient, getClients, getClientByPromo } from "../controllers/clientController.js";

const router = express.Router();

router.post("/register", registerClient);

router.get("/all", getClients);

router.delete("/:id", deleteClient);

router.put("/:id", updateClient);

router.get("/promo/:promo_kod", getClientByPromo);

export default router;
