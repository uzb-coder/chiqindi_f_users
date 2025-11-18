import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Client from "../models/clientModel.js"; // Client modelini import qilish
import DebtClient from "../models/DebtClientModel.js"; // qarz mijozlar bazasi

export const getSales = async (req, res) => {
  try {
    const { from, to, clientId, tolov_turi } = req.query;
    const filter = {};

    if (from && to) {
      filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }
    if (clientId) filter.client = clientId;
    if (tolov_turi) filter.tolov_turi = tolov_turi;

    const sales = await Sale.find(filter)
      .populate("product", "nomi narxi birligi")
      .populate({
        path: "client",
        select: "ism tel manzil promo_kod foiz",
      })
      .sort({ createdAt: -1 });

    const processedSales = sales.map((sale) => {
      const haqiqiyNarx = sale.narxi * sale.miqdor;
      const tolandi = sale.total || 0;
      const qolganQarz = haqiqiyNarx - tolandi;

      let clientInfo = null;
      if (sale.client) {
        const base = {
          _id: sale.client._id,
          ism: sale.client.ism || "Noma'lum",
          tel: sale.client.tel || null,
          manzil: sale.client.manzil || null,
        };

        if (sale.tolov_turi === "qarz") {
          clientInfo = { ...base, type: "qarzdor" };
        } else {
          clientInfo = {
            ...base,
            type: "promo_mijoz",
            promo_kod: sale.client.promo_kod || null,
            foiz: sale.client.foiz || 0,
          };
        }
      }

      return {
        _id: sale._id,
        product: sale.product,
        miqdor: sale.miqdor,
        tolov_turi: sale.tolov_turi,
        narxi: sale.narxi,
        haqiqiy_narx: haqiqiyNarx,
        tolandi,
        qolgan_qarz: qolganQarz,
        client: clientInfo,
        promo: {
          promoCode: sale.promoCode || null,
          discountPercent: sale.discountPercent || 0,
          discountAmount: sale.discountAmount || 0,
        },
        createdAt: sale.createdAt,
      };
    });

    const totalHaqiqiy = processedSales.reduce((s, i) => s + i.haqiqiy_narx, 0);
    const totalTolov = processedSales.reduce((s, i) => s + i.tolandi, 0);
    const totalQarz = totalHaqiqiy - totalTolov;
    const totalDiscount = processedSales.reduce((s, i) => s + i.promo.discountAmount, 0);

    res.status(200).json({
      success: true,
      total_sales: processedSales.length,
      total_sum: totalHaqiqiy,
      total_paid: totalTolov,
      total_debt: totalQarz,
      total_discount: totalDiscount,
      sales: processedSales,
    });
  } catch (error) {
    console.error("getSales xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Sotuvlarni olishda xatolik",
      error: error.message,
    });
  }
};// createSale (to'liq tuzatilgan)

export const createSale = async (req, res) => {
  try {
    const { productId, miqdor, tolov_turi, clientId, clientInfo, promoCode } = req.body;

    // 1. Mahsulotni topish
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });
    if (product.ombordagi_soni < miqdor)
      return res.status(400).json({ message: "Omborda yetarli mahsulot yo‘q" });

    // 2. Asosiy narx
    let basePrice = product.narxi * miqdor;
    let discountPercent = 0;
    let discountAmount = 0;
    let finalPrice = basePrice;

    let usedClient = null;
    let clientModel = null;

    // 3. Promo kod orqali chegirma
    if (promoCode) {
      const promoClient = await Client.findOne({ promo_kod: promoCode });
      if (promoClient && promoClient.foiz > 0) {
        discountPercent = promoClient.foiz;
        discountAmount = (basePrice * discountPercent) / 100;
        finalPrice = basePrice - discountAmount;
        usedClient = promoClient;
        clientModel = "Client"; // To‘g‘ri model
      }
    }

    // 4. To‘lov turi
    let totalToPay = 0;
    let qarzAmount = 0;

    if (tolov_turi === "qarz") {
      qarzAmount = finalPrice;
      totalToPay = 0;

      if (clientId) {
        usedClient = await DebtClient.findById(clientId);
        if (!usedClient) return res.status(404).json({ message: "Qarzdor mijoz topilmadi" });
        clientModel = "DebtClient";
      } else if (clientInfo && clientInfo.ism && clientInfo.tel) {
        usedClient = new DebtClient({
          ism: clientInfo.ism,
          tel: clientInfo.tel,
          manzil: clientInfo.manzil || "",
          qarzlar: [{ miqdor: qarzAmount, createdAt: new Date() }],
        });
        await usedClient.save();
        clientModel = "DebtClient";
      } else {
        return res.status(400).json({ message: "Qarz uchun ism va telefon kerak" });
      }
    } else {
      // Naqd
      totalToPay = finalPrice;
      qarzAmount = 0;
      // Promo bo‘lsa, client allaqachon o‘rnatilgan
    }

    // 5. Omborni kamaytirish
    product.ombordagi_soni -= miqdor;
    await product.save();

    // 6. Sotuvni saqlash
    const sale = new Sale({
      product: product._id,
      miqdor,
      tolov_turi,
      narxi: product.narxi,
      total: totalToPay, // To‘langan summa
      qarz_miqdori: qarzAmount,
      client: usedClient?._id || null,
      clientModel, // MUHIM: populate uchun
      promoCode: promoCode || null,
      discountPercent,
      discountAmount,
    });

    await sale.save();

    res.status(201).json({
      message: "Sotuv muvaffaqiyatli saqlandi",
      sale,
      client: usedClient,
    });
  } catch (error) {
    console.error("createSale xatolik:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

export const previewSale = async (req, res) => {
  try {
    const { products, promoCode } = req.body;
    if (!products || products.length === 0) {
      return res.status(400).json({ message: "Mahsulotlar ro'yxati bo'sh" });
    }

    let totalBeforeDiscount = 0;
    const detailedProducts = [];

    // 🔹 Har bir mahsulot uchun narx * miqdor hisoblash
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Mahsulot topilmadi: ${item.productId}` });
      }

      const price = product.narxi * item.miqdor;
      totalBeforeDiscount += price;

      detailedProducts.push({
        productId: product._id,
        nomi: product.nomi,
        miqdor: item.miqdor,
        price,
      });
    }

    // 🔹 Promo kod bo‘lsa — mijozni topish va chegirma qo‘llash
    let discountPercent = 0;
    let discountAmount = 0;
    let totalAfterDiscount = totalBeforeDiscount;
    let clientInfo = null;

    if (promoCode) {
      const client = await Client.findOne({ promo_kod: promoCode });
      if (client) {
        clientInfo = {
          id: client._id,
          ism: client.ism,
          foiz: client.foiz,
          promo_kod: client.promo_kod,
        };

        if (client.foiz) {
          discountPercent = client.foiz;
          discountAmount = (totalBeforeDiscount * discountPercent) / 100;
          totalAfterDiscount = totalBeforeDiscount - discountAmount;
        }
      }
    }

    // 🔹 Yakuniy javob
    res.json({
      total_before_discount: totalBeforeDiscount,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      total_after_discount: totalAfterDiscount,
      client: clientInfo,
      products: detailedProducts,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// TUZATILGAN - haqiqiy qarzni Sale jadvalidan hisoblaydi
export const getDebtClients = async (req, res) => {
  try {
    const qarzdorlar = await DebtClient.find().lean();
    const clientsWithDebt = [];

    for (const client of qarzdorlar) {
      const umumiyQarz = await calculateRealDebt(client._id);

      if (umumiyQarz > 0) {
        clientsWithDebt.push({
          ...client,
          umumiyQarz
        });
      }
    }

    res.json({
      message: "Qarzdorlar ro'yxati",
      total: clientsWithDebt.length,
      clients: clientsWithDebt
    });
  } catch (error) {
    console.error("getDebtClients xatolik:", error);
    res.status(500).json({ 
      message: "Qarzdorlarni olishda xatolik", 
      error: error.message 
    });
  }
};

export const payDebt = async (req, res) => {
  try {
    const { clientId, amount } = req.body;

    console.log("🟢 PAYDEBT: clientId=", clientId, "amount=", amount);

    const client = await DebtClient.findById(clientId);
    if (!client) return res.status(404).json({ message: "Mijoz topilmadi" });

    const qarzSales = await Sale.find({ 
      client: clientId, 
      tolov_turi: "qarz" 
    }).sort({ createdAt: 1 });
    
    console.log("🟢 PAYDEBT: topilgan sotuvlar soni:", qarzSales.length);

    let qolganTolov = parseFloat(amount);
    let tolovTarixi = [];

    for (const sale of qarzSales) {
      if (qolganTolov <= 0) break;

      const jamiSumma = sale.narxi * sale.miqdor;
      const tolanganSumma = sale.total || 0;
      const qarzdaQolgan = jamiSumma - tolanganSumma;

      if (qarzdaQolgan <= 0) continue;

      const tolandiBuSale = Math.min(qolganTolov, qarzdaQolgan);
      sale.total = tolanganSumma + tolandiBuSale;
      qolganTolov -= tolandiBuSale;

      await sale.save();

      tolovTarixi.push({
        saleId: sale._id,
        tolandi: tolandiBuSale,
        yangiTotal: sale.total
      });
    }

    // Haqiqiy qarzni qayta hisoblash
    const umumiy_qarz = await calculateRealDebt(clientId);

    // DB ga yozamiz
    client.umumiy_qarz = umumiy_qarz;
    await client.save();

    console.log("✅ PAYDEBT tugadi: yangi qarz=", umumiy_qarz);

    res.json({
      message: "Qarz to'lov muvaffaqiyatli amalga oshirildi",
      client: {
        _id: client._id,
        ism: client.ism,
        tel: client.tel,
        manzil: client.manzil,
        umumiy_qarz,
      },
      tolovTarixi
    });

  } catch (error) {
    console.error("❌ PAYDEBT XATOSI:", error);
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

// TUZATILGAN - haqiqiy qarzni Sale jadvalidan hisoblaydi
export const getAllDebtClientsSimple = async (req, res) => {
  try {
    const clients = await DebtClient.find().lean();
    const clientsWithDebt = [];

    for (const client of clients) {
      const umumiyQarz = await calculateRealDebt(client._id);

      if (umumiyQarz > 0) {
        clientsWithDebt.push({
          id: client._id.toString(),
          ism: client.ism,
          tel: client.tel,
          manzil: client.manzil || "",
          umumiyQarz
        });
      }
    }

    console.log("📋 getAllDebtClientsSimple: qarzdorlar soni=", clientsWithDebt.length);

    res.json({
      message: "Barcha qarzdor mijozlar ro'yxati",
      total: clientsWithDebt.length,
      clients: clientsWithDebt
    });
  } catch (error) {
    console.error("getAllDebtClientsSimple xatolik:", error);
    res.status(500).json({
      message: "Xatolik yuz berdi",
      error: error.message
    });
  }
};