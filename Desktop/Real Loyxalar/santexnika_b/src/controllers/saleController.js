import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Client from "../models/clientModel.js"; // Client modelini import qilish
import DebtClient from "../models/DebtClientModel.js"; // qarz mijozlar bazasi

export const calculateRealDebt = async (clientId) => {
  try {
    const sales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz",
    }).lean();

    let totalDebt = 0;
    let totalPaid = 0;

    for (const sale of sales) {
      // Har bir sale ichidagi products array orqali jami summani hisoblash
      let saleTotal = 0;
      for (const p of sale.products) {
        const miqdor = Number(p.miqdor) || 0;
        const narxi = Number(p.narxi) || 0;
        saleTotal += miqdor * narxi;
      }

      totalDebt += saleTotal;
      totalPaid += Number(sale.total) || 0; // to'langan summani olish
    }

    const realDebt = totalDebt - totalPaid;
    return realDebt > 0 ? realDebt : 0;
  } catch (err) {
    console.error("calculateRealDebt xatoligi:", err);
    return 0;
  }
};

export const getSales = async (req, res) => {
  try {
    const { from, to, clientId, tolov_turi } = req.query;
    const filter = {};

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }
    if (clientId) filter.client = clientId;
    if (tolov_turi) filter.tolov_turi = tolov_turi;

    const sales = await Sale.find(filter)
      .populate({
        path: "products.product",
        select: "nomi narxi birligi",
      })
      .populate({
        path: "client",
        select: "ism tel manzil promo_kod foiz",
      })
      .sort({ createdAt: -1 });

    const processedSales = [];
    let totalHaqiqiy = 0;
    let totalTolov = 0;
    let totalDiscount = 0;

    for (const sale of sales) {
      let saleHaqiqiy = 0;
      let saleDiscount = 0;

      // getSales ichida, productsInfo map qismida:
      const productsInfo = sale.products.map((p) => {
        const finalPrice = p.finalPrice ?? p.narxi * p.miqdor;
        saleHaqiqiy += finalPrice;
        saleDiscount += p.discountAmount ?? 0;

        return {
          product: p.product,
          miqdor: p.miqdor,
          narxi: p.narxi,                    // bu endi custom narx (masalan 180000)
          original_narxi: p.original_narxi,  // ombor narxi (150000)
          discountPercent: p.discountPercent ?? 0,
          discountAmount: p.discountAmount ?? 0,
          finalPrice,
        };
      });

      const tolandi = sale.total || 0;
      totalHaqiqiy += saleHaqiqiy;
      totalTolov += tolandi;
      totalDiscount += saleDiscount;

      let clientType = "oddiy";
      let isPromoUsed = sale.promoCode ? true : false;

      if (sale.tolov_turi === "qarz") {
        clientType = "qarzdor";
      } else if (isPromoUsed) {
        clientType = "promo_mijoz";
      }

      let clientInfo = null;
      if (sale.client) {
        clientInfo = {
          _id: sale.client._id,
          ism: sale.client.ism ?? "Noma'lum",
          tel: sale.client.tel ?? "941234567",
          manzil: sale.client.manzil ?? null,
          type: clientType,
          promo_kod: isPromoUsed ? sale.client.promo_kod : null,
          foiz: isPromoUsed ? sale.client.foiz : 0,
        };
      }

      processedSales.push({
        _id: sale._id,
        products: productsInfo,
        tolov_turi: sale.tolov_turi,
        total: saleHaqiqiy,
        qarz_miqdori: sale.qarz_miqdori,
        client: clientInfo,
        promo: {
          promoCode: sale.promoCode ?? null,
          discountPercent: saleDiscount > 0 ? (saleDiscount / saleHaqiqiy) * 100 : 0,
          discountAmount: saleDiscount,
        },
        createdAt: sale.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      total_sales: processedSales.length,
      total_sum: totalHaqiqiy,
      total_paid: totalTolov,
      total_debt: totalHaqiqiy - totalTolov,
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
};

export const createSale = async (req, res) => {
  try {
    const { products, tolov_turi, clientId, clientInfo, promoCode } = req.body;

    // Validatsiya
    if (!products || products.length === 0) {
      return res.status(400).json({ message: "Savatcha bo'sh!" });
    }

    let totalToPay = 0;
    let qarzAmount = 0;
    let saleProducts = [];
    let usedClient = null;
    let clientModel = null;

    // Promo mijozni aniqlash
    if (promoCode) {
      const promoClient = await Client.findOne({ promo_kod: promoCode });
      if (promoClient) {
        usedClient = promoClient;
        clientModel = "Client";
      }
    }

    // Har bir mahsulotni qayta ishlash
    for (let item of products) {
      const { productId, miqdor, narxi } = item; // narxi frontendan keladi

      if (!productId || !miqdor || miqdor <= 0) {
        return res.status(400).json({ message: "Mahsulot ma'lumotlari noto‘g‘ri" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: `Mahsulot topilmadi: ${productId}` });
      }

      if (product.ombordagi_soni < miqdor) {
        return res.status(400).json({
          message: `Omborda yetarli emas: ${product.nomi} (bor: ${product.ombordagi_soni})`,
        });
      }

      // Muhim: Foydalanuvchi o‘zgartirgan narxni ishlatamiz, aks holda ombor narxini
      const usedPrice = (narxi && narxi > 0) ? narxi : product.narxi;

      // Asl narxdan hisoblaymiz (chegirma uchun)
      const basePriceFromOriginal = product.narxi * miqdor;
      let discountPercent = 0;
      let discountAmount = 0;
      let finalPrice = usedPrice * miqdor; // bu haqiqiy to‘lov summasi

      // Chegirma faqat promo mijoz bo‘lsa va foiz > 0 bo‘lsa
      if (usedClient && usedClient.foiz > 0) {
        discountPercent = usedClient.foiz;
        discountAmount = (basePriceFromOriginal * discountPercent) / 100;
        // Chegirmadan keyin final narxni qayta hisoblaymiz
        finalPrice = (usedPrice * miqdor) - discountAmount;
      }

      // Ombor kamaytirish
      product.ombordagi_soni -= miqdor;
      await product.save();

      // Sale ga saqlanadigan ma'lumot
      saleProducts.push({
        product: product._id,
        miqdor,
        narxi: usedPrice,                    // bu sotuvdagi real narx (custom bo‘lishi mumkin)
        original_narxi: product.narxi,       // ombordagi asl narx (hisobot uchun)
        discountPercent,
        discountAmount,
        finalPrice,                          // oxirgi to‘lov summasi (chegirma hisobda)
      });

      // To‘lov turiga qarab jami hisob
      if (tolov_turi === "naqd" || tolov_turi === "karta") {
        totalToPay += finalPrice;
      } else if (tolov_turi === "qarz") {
        qarzAmount += finalPrice;
      }
    }

    // Qarzdor mijozni yaratish/aniqlash
    if (tolov_turi === "qarz") {
      if (clientId) {
        usedClient = await DebtClient.findById(clientId);
        if (!usedClient) return res.status(404).json({ message: "Qarzdor topilmadi" });
        clientModel = "DebtClient";
      } else if (clientInfo?.ism && clientInfo?.tel) {
        usedClient = new DebtClient({
          ism: clientInfo.ism,
          tel: clientInfo.tel,
          manzil: clientInfo.manzil || "",
          qarzlar: [{ miqdor: qarzAmount, sale: null, createdAt: new Date() }],
        });
        await usedClient.save();
        clientModel = "DebtClient";
      } else {
        return res.status(400).json({ message: "Qarz uchun ism va telefon kerak" });
      }
    }

    // Sotuvni saqlash
    const sale = new Sale({
      products: saleProducts,
      tolov_turi,
      total: totalToPay,           // naqd/karta uchun
      qarz_miqdori: qarzAmount,    // qarz uchun
      client: usedClient?._id || null,
      clientModel,
      promoCode: promoCode || null,
      createdBy: req.user?._id || null, // agar auth bo‘lsa
    });

    await sale.save();

    res.status(201).json({
      success: true,
      message: "Sotuv muvaffaqiyatli amalga oshirildi",
      sale,
    });
  } catch (error) {
    console.error("createSale xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
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

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Mahsulot topilmadi: ${item.productId}` });
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

        // Faqat foiz > 0 bo‘lsa chegirma qo‘llaymiz
        if (client.foiz > 0) {
          discountPercent = client.foiz;
          discountAmount = (totalBeforeDiscount * discountPercent) / 100;
          totalAfterDiscount = totalBeforeDiscount - discountAmount;
        }
      }
    }

    res.json({
      total_before_discount: totalBeforeDiscount,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      total_after_discount: totalAfterDiscount,
      client: clientInfo,
      products: detailedProducts,
    });
  } catch (error) {
    res.status(500).json({ message: "Xatolik yuz berdi", error: error.message });
  }
};

export const getDebtClients = async (req, res) => {
  try {
    const result = await Sale.aggregate([
      {
        $match: {
          tolov_turi: "qarz",
          clientModel: "DebtClient",
          client: { $ne: null }
        }
      },
      {
        $lookup: {
          from: "debtclients", // Agar collection nomingiz boshqacha bo‘lsa, o‘zgartiring!!!
          localField: "client",
          foreignField: "_id",
          as: "clientInfo"
        }
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$client",
          clientInfo: { $first: "$clientInfo" },
          umumiyQarz: {
            $sum: { $subtract: [{ $multiply: ["$narxi", "$miqdor"] }, { $ifNull: ["$total", 0] }] }
          }
        }
      },
      { $match: { umumiyQarz: { $gt: 0 } } },
      {
        $project: {
          _id: "$clientInfo._id",
          ism: "$clientInfo.ism",
          tel: "$clientInfo.tel",
          manzil: "$clientInfo.manzil",
          umumiyQarz: 1
        }
      },
      { $sort: { umumiyQarz: -1 } }
    ]);

    res.json({
      message: "Barcha qarzdor mijozlar ro'yxati",
      total: result.length,
      clients: result
    });
  } catch (error) {
    console.error("getDebtClients xato:", error);
    res.status(500).json({ message: "Xatolik", error: error.message });
  }
};

export const payDebt = async (req, res) => {
  try {
    const { clientId, amount } = req.body;
    const client = await DebtClient.findById(clientId);
    if (!client) return res.status(404).json({ message: "Mijoz topilmadi" });

    const qarzSales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz",
    }).sort({ createdAt: 1 });

    let qolganTolov = Number(amount);
    let tolovTarixi = [];

    for (const sale of qarzSales) {
      if (qolganTolov <= 0) break;

      // Har bir sale bo‘yicha jami summani hisoblaymiz
      let saleTotal = 0;
      for (const p of sale.products) {
        saleTotal += (p.miqdor || 0) * (p.narxi || 0);
      }

      const tolanganSumma = Number(sale.total) || 0;
      const qarzdaQolgan = saleTotal - tolanganSumma;
      if (qarzdaQolgan <= 0) continue;

      const tolandiBuSale = Math.min(qolganTolov, qarzdaQolgan);
      sale.total = tolanganSumma + tolandiBuSale;
      await sale.save();

      qolganTolov -= tolandiBuSale;

      tolovTarixi.push({
        saleId: sale._id,
        tolandi: tolandiBuSale,
        yangiTotal: sale.total
      });
    }

    const umumiy_qarz = await calculateRealDebt(clientId);

    // Client DB ni yangilaymiz
    client.umumiy_qarz = umumiy_qarz;
    await client.save();

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

export const getAllDebtClientsSimple = async (req, res) => {
  try {
    const clients = await DebtClient.find().lean();

    const clientsWithDebtHistory = [];

    for (const client of clients) {
      const sales = await Sale.find({
        client: client._id,
        clientModel: "DebtClient",
        tolov_turi: "qarz",
      }).sort({ createdAt: 1 }).lean();

      if (sales.length === 0) continue;

      let jamiQarz = 0;
      let jamiTolangan = 0;

      const qarzTarixi = [];
      const tolovTarixi = [];

      let birinchiQarzSana = null;
      let oxirgiQarzSana = null;

      for (const sale of sales) {
        const saleSum = sale.products.reduce(
          (sum, p) => sum + (p.finalPrice || p.narxi * p.miqdor),
          0
        );

        const paid = Number(sale.total) || 0;

        jamiQarz += saleSum;
        jamiTolangan += paid;

        const qolgan = saleSum - paid;

        if (!birinchiQarzSana) birinchiQarzSana = sale.createdAt;
        oxirgiQarzSana = sale.createdAt;

        qarzTarixi.push({
          saleId: sale._id,
          sana: sale.createdAt,
          jamiSumma: saleSum,
          tolangan: paid,
          qolganQarz: qolgan,
          status: qolgan > 0 ? "qarzda" : "to'langan"
        });

        if (paid > 0) {
          tolovTarixi.push({
            saleId: sale._id,
            tolovSummasi: paid,
            tolovSanasi: sale.updatedAt || sale.createdAt,
            qarzOlinganSana: sale.createdAt,
          });
        }
      }

      const qolganQarz = jamiQarz - jamiTolangan;

      clientsWithDebtHistory.push({
        id: client._id.toString(),
        ism: client.ism,
        tel: client.tel,
        manzil: client.manzil || "Manzil kiritilmagan",

        jamiQarz,       // ➤ Jami qarz qancha bo‘lgan
        jamiTolangan,   // ➤ Jami to‘lov qancha bo‘lgan
        qolganQarz,     // ➤ Hozirgi qolgan qarz

        status: qolganQarz > 0 ? "qarzdor" : "to'langan",

        birinchiQarzSana,
        oxirgiQarzSana,
        qarzlarSoni: qarzTarixi.filter(q => q.qolganQarz > 0).length,
        toliqTolanganlarSoni: qarzTarixi.filter(q => q.status === "to'langan").length,

        jamiSotuvlarSoni: sales.length,
        qarzTarixi,
        tolovTarixi,
      });
    }

    res.json({
      success: true,
      clients: clientsWithDebtHistory,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error.message
    });
  }
};
