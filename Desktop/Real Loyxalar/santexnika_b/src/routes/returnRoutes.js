import express from "express";
import { createReturn, getReturnStats,confirmReturn, getReturns,getConfirmedReturns } from "../controllers/returnController.js";

const router = express.Router();

router.get("/all", getReturns);

router.post("/create", createReturn);

router.put("/confirm", confirmReturn);

router.get("/confirmed", getConfirmedReturns);

router.get("/returns/stats", getReturnStats);

export default router;
