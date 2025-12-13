import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Client from "../models/clientModel.js";
import DebtClient from "../models/DebtClientModel.js";

// Haqiqiy qarzni hisoblash
export const calculateRealDebt = async (clientId) => {
  try {
    const sales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz",
    }).lean();

    let totalDebt = 0;
    let totalPaid = 0;

    for (const sale of sales) {
      let saleTotal = 0;
      for (const p of sale.products) {
        const finalPrice = p.finalPrice ?? (p.narxi * p.miqdor);
        saleTotal += finalPrice;
      }
      totalDebt += saleTotal;
      totalPaid += Number(sale.total) || 0;
    }

    return Math.max(0, totalDebt - totalPaid);
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
        select: "nomi narxi birligi ombordagi_soni",
      })
      .sort({ createdAt: -1 })
      .lean();

    const processedSales = [];
    let totalHaqiqiy = 0;
    let totalTolov = 0;
    let totalDiscount = 0;

    for (const sale of sales) {
      let saleHaqiqiy = 0;
      let saleDiscount = 0;

      const productsInfo = sale.products.map((p) => {
        const finalPrice = p.finalPrice ?? p.narxi * p.miqdor;
        saleHaqiqiy += finalPrice;
        saleDiscount += p.discountAmount ?? 0;

        return {
          product: p.product,
          miqdor: p.miqdor,
          narxi: p.narxi,
          original_narxi: p.original_narxi || p.narxi,
          discountPercent: p.discountPercent ?? 0,
          discountAmount: p.discountAmount ?? 0,
          finalPrice,
        };
      });

      const tolandi = sale.total || 0;
      totalHaqiqiy += saleHaqiqiy;
      totalTolov += tolandi;
      totalDiscount += saleDiscount;

      // ✅ Client ma'lumotlarini to'g'ri olish
      let clientInfo = null;
      const paymentMethod = sale.tolov_turi || "naqd";

      // 1. Avval sale.client dan qidirish
      if (sale.client) {
        let clientData = null;
        
        // DebtClient modelidan qidirish
        if (sale.clientModel === "DebtClient" || paymentMethod === "qarz") {
          clientData = await DebtClient.findById(sale.client).lean();
        }
        
        // Client modelidan qidirish
        if (!clientData) {
          clientData = await Client.findById(sale.client).lean();
        }

        // Client topilgan bo'lsa
        if (clientData) {
          clientInfo = {
            _id: clientData._id,
            ism: clientData.ism || "Noma'lum",
            tel: clientData.tel || "Raqam yo'q",
            manzil: clientData.manzil || null,
            payment_method: paymentMethod,
            type: paymentMethod === "qarz" ? "qarzdor" : 
                  clientData.promo_kod ? "promo_mijoz" : "oddiy",
            promo_kod: clientData.promo_kod || null,
            foiz: clientData.foiz || 0,
          };
        }
      }

      // ✅ 2. Agar client topilmasa va promoCode bor bo'lsa
      if (!clientInfo && sale.promoCode) {
        // Avval promo_kod maydonidan qidirish
        let promoClient = await Client.findOne({ 
          promo_kod: sale.promoCode 
        }).lean();
        
        // Agar topilmasa, ID orqali qidirish
        if (!promoClient) {
          try {
            promoClient = await Client.findById(sale.promoCode).lean();
          } catch (err) {
            console.log("PromoCode ID noto'g'ri:", sale.promoCode);
          }
        }
        
        if (promoClient) {
          clientInfo = {
            _id: promoClient._id,
            ism: promoClient.ism || "Noma'lum",
            tel: promoClient.tel || "Raqam yo'q",
            manzil: promoClient.manzil || null,
            payment_method: paymentMethod,
            type: "promo_mijoz",
            promo_kod: promoClient.promo_kod || null,
            foiz: promoClient.foiz || 0,
          };
        }
      }

      processedSales.push({
        _id: sale._id,
        products: productsInfo,
        tolov_turi: sale.tolov_turi,
        total: saleHaqiqiy,
        qarz_miqdori: sale.qarz_miqdori || 0,
        client: clientInfo, // ✅ Endi to'g'ri
        promo: {
          promoCode: sale.promoCode || null,
          discountPercent: saleHaqiqiy > 0 ? (saleDiscount / saleHaqiqiy) * 100 : 0,
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
      message: "Sotuvlarni olishda xatolik yuz berdi",
      error: error.message,
    });
  }
};

export const createSale = async (req, res) => {
  try {
    const {
      products,
      tolov_turi,
      clientId,
      clientInfo,
      promoCode,
      naqd_summa = 0,
      karta_summa = 0
    } = req.body;

    // ✅ DEBUG: Kelgan ma'lumotlarni ko'rish
    console.log("📥 createSale kelgan ma'lumotlar:", {
      tolov_turi,
      clientId,
      clientInfo,
      promoCode
    });

    if (!products || products.length === 0) {
      return res.status(400).json({ message: "Savatcha bo'sh!" });
    }

    let totalHaqiqiy = 0;
    let saleProducts = [];
    let usedClient = null;
    let clientModel = null;

    // ✅ 1. Promo kod bilan mijoz
    if (promoCode) {
      const promoClient = await Client.findOne({ promo_kod: promoCode });
      if (promoClient) {
        usedClient = promoClient;
        clientModel = "Client";
      }
    }
    
    // ✅ 2. Mavjud clientId orqali
    else if (clientId) {
      let client = await Client.findById(clientId);
      if (client) {
        usedClient = client;
        clientModel = "Client";
      } else {
        client = await DebtClient.findById(clientId);
        if (client) {
          usedClient = client;
          clientModel = "DebtClient";
        }
      }
    }
    
    // ✅ 3. Qarz sotuvda - majburiy mijoz yaratish
    else if (tolov_turi === "qarz" || tolov_turi === "aralash") {
      if (clientInfo?.ism && clientInfo?.tel) {
        usedClient = new DebtClient({
          ism: clientInfo.ism,
          tel: clientInfo.tel,
          manzil: clientInfo.manzil || ""
        });
        await usedClient.save();
        clientModel = "DebtClient";
      } else {
        return res.status(400).json({ 
          message: "Qarz uchun mijoz ismi va telefon raqami majburiy" 
        });
      }
    }
    
    // ✅ 4. Naqd/karta sotuvda - ixtiyoriy mijoz yaratish
    else if (tolov_turi === "naqd" || tolov_turi === "karta") {
      console.log("💳 Naqd/karta sotuv:", { clientInfo });
      
      // ✅ YANGI: Agar clientInfo berilgan bo'lsa, mijoz yaratish
      if (clientInfo?.ism || clientInfo?.tel) {
        console.log("✅ Mijoz yaratilmoqda:", clientInfo);
        usedClient = new Client({
          ism: clientInfo.ism?.trim() || "Naqd mijoz",
          tel: clientInfo.tel || "",
          manzil: clientInfo.manzil || "",
          type: "oddiy",
          foiz: 0,
          payment_method: tolov_turi
        });
        await usedClient.save();
        clientModel = "Client";
        console.log("✅ Mijoz yaratildi:", usedClient._id);
      } else {
        console.log("⚠️ clientInfo bo'sh, mijoz yaratilmaydi");
      }
      // ✅ Agar clientInfo bo'sh bo'lsa, client null bo'ladi (bu normal)
    }

    // Mahsulotlarni qayta ishlash
    for (let item of products) {
      const { productId, miqdor, narxi } = item;
      if (!productId || !miqdor || miqdor <= 0) {
        return res.status(400).json({ message: "Mahsulot ma'lumotlari noto'g'ri" });
      }

      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ 
        message: `Mahsulot topilmadi: ${productId}` 
      });

      product.ombordagi_soni -= miqdor;
      await product.save();

      const usedPrice = narxi > 0 ? narxi : product.narxi;
      const basePrice = product.narxi * miqdor;

      let discountPercent = 0;
      let discountAmount = 0;
      let finalPrice = usedPrice * miqdor;

      if (usedClient && usedClient.foiz > 0) {
        discountPercent = usedClient.foiz;
        discountAmount = (basePrice * discountPercent) / 100;
        finalPrice = basePrice - discountAmount;
      }

      totalHaqiqiy += finalPrice;

      saleProducts.push({
        product: product._id,
        miqdor,
        narxi: usedPrice,
        original_narxi: product.narxi,
        discountPercent,
        discountAmount,
        finalPrice
      });
    }

    // To'lov hisoblash
    let tolangan = 0;
    let qarz_miqdori = 0;

    if (tolov_turi === "naqd" || tolov_turi === "karta") {
      tolangan = totalHaqiqiy;
    } else if (tolov_turi === "qarz") {
      qarz_miqdori = totalHaqiqiy;
    } else if (tolov_turi === "aralash") {
      tolangan = Math.min(totalHaqiqiy, (Number(naqd_summa) || 0) + (Number(karta_summa) || 0));
      qarz_miqdori = totalHaqiqiy - tolangan;
    }

    const sale = new Sale({
      products: saleProducts,
      tolov_turi,
      total: tolangan,
      qarz_miqdori,
      naqd_summa: tolov_turi === "naqd" ? totalHaqiqiy : (tolov_turi === "aralash" ? Number(naqd_summa) : 0),
      karta_summa: tolov_turi === "karta" ? totalHaqiqiy : (tolov_turi === "aralash" ? Number(karta_summa) : 0),
      client: usedClient?._id || null,
      clientModel: clientModel || null,
      promoCode: promoCode || null,
      createdBy: req.user?._id || null
    });

    await sale.save();

    res.status(201).json({
      success: true,
      message: "Sotuv muvaffaqiyatli yaratildi",
      sale: {
        ...sale.toObject(),
        haqiqiy_jami: totalHaqiqiy,
        tolangan,
        qarzda_qolgan: qarz_miqdori
      }
    });

  } catch (error) {
    console.error("createSale xatolik:", error);
    res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message
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

export const payDebt = async (req, res) => {
  try {
    const { clientId, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "To'lov summasi noto'g'ri" });
    }

    // Mijozni topish
    let client = await DebtClient.findById(clientId);
    if (!client) {
      client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ message: "Mijoz topilmadi" });
      }
    }

    // ✅ lean() bilan olish - faqat o'qish uchun
    const qarzSales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz",
    }).sort({ createdAt: 1 }).lean();

    console.log("🔍 Topilgan qarz sotuvlar:", qarzSales.length);

    let qolganTolov = Number(amount);
    let tolovTarixi = [];

    for (const sale of qarzSales) {
      if (qolganTolov <= 0) break;

      // finalPrice dan hisoblash
      let saleTotal = 0;
      for (const p of sale.products) {
        const finalPrice = p.finalPrice ?? (p.narxi * p.miqdor);
        saleTotal += finalPrice;
      }

      const tolanganSumma = Number(sale.total) || 0;
      const qarzdaQolgan = saleTotal - tolanganSumma;

      console.log("📊 Sale:", {
        id: sale._id,
        saleTotal,
        tolanganSumma,
        qarzdaQolgan
      });

      if (qarzdaQolgan <= 0) continue;

      const tolandiBuSale = Math.min(qolganTolov, qarzdaQolgan);
      const yangiTotal = tolanganSumma + tolandiBuSale;
      
      console.log("💾 Yangilash:", {
        oldTotal: tolanganSumma,
        newTotal: yangiTotal,
        tolandiBuSale
      });
      
      // ✅ YECHIM: findByIdAndUpdate ishlatish (middleware bypass)
      const updatedSale = await Sale.findByIdAndUpdate(
        sale._id,
        { 
          $set: { total: yangiTotal },
          $inc: {} // Bo'sh $inc operator - middleware trigger qilmaslik uchun
        },
        { 
          new: true,
          runValidators: false // Validator ishlatmaslik
        }
      ).lean();
      
      console.log("✅ Saqlandi:", {
        id: updatedSale._id,
        total: updatedSale.total
      });

      qolganTolov -= tolandiBuSale;

      tolovTarixi.push({
        saleId: sale._id,
        qarzOlinganSana: sale.createdAt,
        tolovSummasi: tolandiBuSale,
        yangiTotal: updatedSale.total, // ✅ Yangilangan qiymat
        qolganQarz: saleTotal - updatedSale.total,
      });
    }

    // ✅ Yangilangan ma'lumotlarni qayta hisoblash
    const updatedSales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz",
    }).lean();

    let jamiQarzBerilgan = 0;
    let jamiTolangan = 0;

    for (const sale of updatedSales) {
      let saleTotal = 0;
      for (const p of sale.products) {
        const finalPrice = p.finalPrice ?? (p.narxi * p.miqdor);
        saleTotal += finalPrice;
      }
      jamiQarzBerilgan += saleTotal;
      jamiTolangan += Number(sale.total) || 0;
    }

    console.log("📈 Jami:", {
      jamiQarzBerilgan,
      jamiTolangan,
      hozirgiQarz: jamiQarzBerilgan - jamiTolangan
    });

    const hozirgiQarz = Math.max(0, jamiQarzBerilgan - jamiTolangan);

    // DebtClient ni yangilash
    if (client.constructor.modelName === "DebtClient") {
      client.hozirgiQarz = hozirgiQarz;
      client.jamiTolangan = jamiTolangan;
      await client.save();
    }

    res.json({
      success: true,
      message: "Qarz to'lov muvaffaqiyatli",
      client: {
        _id: client._id,
        ism: client.ism,
        tel: client.tel,
        hozirgiQarz: hozirgiQarz,
        jamiTolangan: jamiTolangan,
      },
      tolovTarixi,
    });

  } catch (error) {
    console.error("❌ payDebt xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error.message,
    });
  }
};

// ✅ Qarzdor mijozlar ro'yxati (optimallashtirilgan)
export const getAllDebtClientsSimple = async (req, res) => {
  try {
    const clients = await DebtClient.find().lean();
    const clientsWithDebtHistory = [];

    for (const client of clients) {
      const sales = await Sale.find({
        client: client._id,
        clientModel: "DebtClient",
        tolov_turi: "qarz",
      })
        .populate("products.product", "nomi")
        .sort({ createdAt: 1 })
        .lean();

      if (sales.length === 0) continue;

      let jamiQarzBerilgan = 0;
      let jamiTolangan = 0;
      const qarzTarixi = [];

      for (const sale of sales) {
        let saleSum = 0;
        const mahsulotlar = [];

        for (const p of sale.products) {
          const finalPrice = p.finalPrice ?? (p.narxi * p.miqdor);
          saleSum += finalPrice;

          mahsulotlar.push({
            nom: p.product?.nomi || "Noma'lum",
            miqdor: p.miqdor || 0,
            narxi: p.narxi || 0,
            jami: finalPrice
          });
        }

        const tolangan = Number(sale.total) || 0;
        const qolganQarz = saleSum - tolangan;

        jamiQarzBerilgan += saleSum;
        jamiTolangan += tolangan;

        qarzTarixi.push({
          saleId: sale._id.toString(),
          sana: sale.createdAt,
          mahsulotlar: mahsulotlar,
          umumiySumma: saleSum,
          tolangan: tolangan,
          qolganQarz: qolganQarz,
          status: qolganQarz > 0 ? "qarzdor" : "to'langan",
          izoh: sale.izoh || ""
        });
      }

      const hozirgiQarz = jamiQarzBerilgan - jamiTolangan;

      clientsWithDebtHistory.push({
        id: client._id.toString(),
        ism: client.ism,
        tel: client.tel,
        manzil: client.manzil || "",
        jamiQarzBerilgan: jamiQarzBerilgan,
        jamiTolangan: jamiTolangan,
        hozirgiQarz: hozirgiQarz,
        status: hozirgiQarz > 0 ? "qarzdor" : "to'langan",
        birinchiQarzSana: sales[0]?.createdAt || null,
        oxirgiQarzSana: sales[sales.length - 1]?.createdAt || null,
        faolQarzlarSoni: qarzTarixi.filter(q => q.qolganQarz > 0).length,
        toliqTolanganlarSoni: qarzTarixi.filter(q => q.status === "to'langan").length,
        jamiSotuvlarSoni: sales.length,
        qarzTarixi: qarzTarixi
      });
    }

    clientsWithDebtHistory.sort((a, b) => b.hozirgiQarz - a.hozirgiQarz);

    res.json({
      success: true,
      totalClients: clientsWithDebtHistory.length,
      clients: clientsWithDebtHistory
    });

  } catch (error) {
    console.error("getAllDebtClientsSimple xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Server xatoligi",
      error: error.message
    });
  }
};

export const getDebtClients = async (req, res) => {
  try {
    const clients = await DebtClient.find().lean();
    const result = [];

    for (const client of clients) {
      const sales = await Sale.find({
        client: client._id,
        tolov_turi: "qarz",
      }).lean();

      let totalDebt = 0;
      let totalPaid = 0;

      for (const sale of sales) {
        let saleSum = 0;
        for (const p of sale.products) {
          const finalPrice = p.finalPrice ?? (p.narxi * p.miqdor);
          saleSum += finalPrice;
        }
        totalDebt += saleSum;
        totalPaid += Number(sale.total) || 0;
      }

      const currentDebt = totalDebt - totalPaid;
      if (currentDebt > 0) {
        result.push({
          _id: client._id,
          ism: client.ism,
          tel: client.tel,
          manzil: client.manzil,
          umumiyQarz: currentDebt
        });
      }
    }

    result.sort((a, b) => b.umumiyQarz - a.umumiyQarz);

    res.json({
      success: true,
      total: result.length,
      clients: result
    });
  } catch (error) {
    console.error("getDebtClients xato:", error);
    res.status(500).json({ 
      success: false,
      message: "Xatolik", 
      error: error.message 
    });
  }
};

export default {
  getSales,
  createSale,
  previewSale,
  payDebt,
  getDebtClients,
  getAllDebtClientsSimple,
  calculateRealDebt
};  