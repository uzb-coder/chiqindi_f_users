import Sale from "../models/Sale.js";
import DebtClient from "../models/DebtClientModel.js";
import Client from "../models/clientModel.js";
import DebtPayment from "../models/DebtPayment.js";

// ============================================
// 1. QARZNI TO'LASH - Har bir sale'ni alohida
// ============================================
export const payDebtForSale = async (req, res) => {
  try {
    const { clientId, saleId, amount } = req.body;

    console.log("💰 Qarz to'lash:", { clientId, saleId, amount });

    // Validatsiya
    if (!clientId || !saleId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Client ID, Sale ID va to'lov summasi majburiy" 
      });
    }

    // Mijozni topish
    let client = await DebtClient.findById(clientId);
    let clientModel = "DebtClient";
    
    if (!client) {
      client = await Client.findById(clientId);
      clientModel = "Client";
      
      if (!client) {
        return res.status(404).json({ 
          success: false,
          message: "Mijoz topilmadi" 
        });
      }
    }

    // Sale'ni topish
    const sale = await Sale.findById(saleId)
      .populate("products.product", "nomi")
      .lean();

    if (!sale) {
      return res.status(404).json({ 
        success: false,
        message: "Sotuv topilmadi" 
      });
    }

    // Sale'ning umumiy summasi
    let saleTotal = 0;
    for (const p of sale.products) {
      saleTotal += p.finalPrice || (p.narxi * p.miqdor);
    }

    const tolanganSumma = Number(sale.total) || 0;
    const qolganQarz = saleTotal - tolanganSumma;

    console.log("📊 Sale ma'lumotlari:", {
      saleTotal,
      tolanganSumma,
      qolganQarz
    });

    // Qarz qolmagan bo'lsa
    if (qolganQarz <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bu sotuv uchun qarz qolmagan"
      });
    }

    // To'lov qarzdan ko'p bo'lsa
    if (amount > qolganQarz) {
      return res.status(400).json({
        success: false,
        message: `To'lov summasi qarzdan ko'p. Qolgan qarz: ${qolganQarz} so'm`
      });
    }

    // Sale'ni yangilash
    const yangiTotal = tolanganSumma + Number(amount);
    
    await Sale.findByIdAndUpdate(
      saleId,
      { $set: { total: yangiTotal } },
      { new: true, runValidators: false }
    );

    console.log("✅ Sale yangilandi:", {
      oldTotal: tolanganSumma,
      newTotal: yangiTotal,
      payment: amount
    });

    // To'lov tarixini saqlash
    const payment = new DebtPayment({
      client: clientId,
      clientModel: clientModel,
      sale: saleId,
      tolovSummasi: Number(amount),
      qarzOlinganSana: sale.createdAt,
      umumiyQarz: saleTotal,
      qolganQarz: saleTotal - yangiTotal
    });

    await payment.save();

    // Mijozning umumiy qarzini yangilash
    const allSales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz"
    }).lean();

    let jamiQarz = 0;
    let jamiTolangan = 0;

    for (const s of allSales) {
      let total = 0;
      for (const p of s.products) {
        total += p.finalPrice || (p.narxi * p.miqdor);
      }
      jamiQarz += total;
      jamiTolangan += Number(s.total) || 0;
    }

    const hozirgiQarz = jamiQarz - jamiTolangan;

    // DebtClient'ni yangilash
    if (clientModel === "DebtClient") {
      await DebtClient.findByIdAndUpdate(clientId, {
        $set: {
          qarz_miqdori: hozirgiQarz,
          jamiTolangan: jamiTolangan
        }
      });
    }

    res.json({
      success: true,
      message: "Qarz muvaffaqiyatli to'landi",
      data: {
        payment: {
          id: payment._id,
          tolovSummasi: amount,
          sana: payment.createdAt
        },
        sale: {
          id: saleId,
          umumiyQarz: saleTotal,
          oldinTolanganSumma: tolanganSumma,
          hozirTolanganSumma: amount,
          jamiTolangan: yangiTotal,
          qolganQarz: saleTotal - yangiTotal,
          status: (saleTotal - yangiTotal) <= 0 ? "to'langan" : "qarzdor"
        },
        client: {
          id: clientId,
          ism: client.ism,
          tel: client.tel,
          umumiyQarz: jamiQarz,
          jamiTolangan: jamiTolangan,
          hozirgiQarz: hozirgiQarz
        }
      }
    });

  } catch (error) {
    console.error("❌ payDebtForSale xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error.message
    });
  }
};

// ============================================
// 2. TO'LANGAN QARZLAR TARIXI
// ============================================
export const getDebtPaymentHistory = async (req, res) => {
  try {
    const { clientId, saleId, from, to } = req.query;

    const filter = {};
    
    if (clientId) filter.client = clientId;
    if (saleId) filter.sale = saleId;
    
    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const payments = await DebtPayment.find(filter)
      .populate("client", "ism tel manzil")
      .populate({
        path: "sale",
        select: "products createdAt total",
        populate: {
          path: "products.product",
          select: "nomi"
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    const processedPayments = payments.map(payment => {
      const mahsulotlar = payment.sale?.products?.map(p => ({
        nomi: p.product?.nomi || "Noma'lum",
        miqdor: p.miqdor,
        narxi: p.narxi,
        jami: p.finalPrice || (p.narxi * p.miqdor)
      })) || [];

      return {
        id: payment._id,
        client: {
          id: payment.client?._id,
          ism: payment.client?.ism || "Noma'lum",
          tel: payment.client?.tel || ""
        },
        sale: {
          id: payment.sale?._id,
          mahsulotlar: mahsulotlar,
          qarzOlinganSana: payment.qarzOlinganSana
        },
        tolovSummasi: payment.tolovSummasi,
        umumiyQarz: payment.umumiyQarz,
        qolganQarz: payment.qolganQarz,
        status: payment.qolganQarz <= 0 ? "to'liq to'langan" : "qisman to'langan",
        tolovSana: payment.createdAt
      };
    });

    // Statistika
    const totalPaid = payments.reduce((sum, p) => sum + p.tolovSummasi, 0);
    const totalDebt = payments.reduce((sum, p) => sum + p.umumiyQarz, 0);
    const remainingDebt = payments.reduce((sum, p) => sum + p.qolganQarz, 0);

    res.json({
      success: true,
      statistics: {
        jamiTolovlar: payments.length,
        jamiTolanganSumma: totalPaid,
        umumiyQarz: totalDebt,
        qolganQarz: remainingDebt,
        toliqTolanganlar: payments.filter(p => p.qolganQarz <= 0).length,
        qismanTolanganlar: payments.filter(p => p.qolganQarz > 0).length
      },
      payments: processedPayments
    });

  } catch (error) {
    console.error("❌ getDebtPaymentHistory xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error.message
    });
  }
};

// ============================================
// 3. QARZDORLAR RO'YXATI - To'liq ma'lumot
// ============================================
export const getAllDebtClientsDetailed = async (req, res) => {
  try {
    const clients = await DebtClient.find().lean();
    const clientsWithDetails = [];

    for (const client of clients) {
      // Barcha qarz sotuvlar
      const sales = await Sale.find({
        client: client._id,
        tolov_turi: "qarz"
      })
        .populate("products.product", "nomi")
        .sort({ createdAt: 1 })
        .lean();

      if (sales.length === 0) continue;

      // To'lov tarixi
      const payments = await DebtPayment.find({
        client: client._id
      })
        .sort({ createdAt: -1 })
        .lean();

      let jamiQarz = 0;
      let jamiTolangan = 0;
      const qarzTarixi = [];

      for (const sale of sales) {
        let saleTotal = 0;
        const mahsulotlar = [];

        for (const p of sale.products) {
          const finalPrice = p.finalPrice || (p.narxi * p.miqdor);
          saleTotal += finalPrice;

          mahsulotlar.push({
            nomi: p.product?.nomi || "Noma'lum",
            miqdor: p.miqdor,
            narxi: p.narxi,
            jami: finalPrice
          });
        }

        const tolangan = Number(sale.total) || 0;
        const qolganQarz = saleTotal - tolangan;

        jamiQarz += saleTotal;
        jamiTolangan += tolangan;

        // Bu sale uchun to'lovlar
        const salePayments = payments.filter(
          p => p.sale?.toString() === sale._id.toString()
        );

        qarzTarixi.push({
          saleId: sale._id.toString(),
          qarzOlinganSana: sale.createdAt,
          mahsulotlar: mahsulotlar,
          umumiyQarz: saleTotal,
          tolangan: tolangan,
          qolganQarz: qolganQarz,
          status: qolganQarz <= 0 ? "to'liq to'langan" : "qarzdor",
          tolovlarSoni: salePayments.length,
          oxirgiTolov: salePayments[0]?.createdAt || null
        });
      }

      const hozirgiQarz = jamiQarz - jamiTolangan;

      clientsWithDetails.push({
        id: client._id.toString(),
        ism: client.ism,
        tel: client.tel,
        manzil: client.manzil || "",
        
        // Umumiy statistika
        jamiQarz: jamiQarz,
        jamiTolangan: jamiTolangan,
        hozirgiQarz: hozirgiQarz,
        
        // Foizlar
        tolanganFoiz: jamiQarz > 0 ? Math.round((jamiTolangan / jamiQarz) * 100) : 0,
        qolganFoiz: jamiQarz > 0 ? Math.round((hozirgiQarz / jamiQarz) * 100) : 0,
        
        // Sanalar
        birinchiQarzSana: sales[0]?.createdAt || null,
        oxirgiQarzSana: sales[sales.length - 1]?.createdAt || null,
        oxirgiTolovSana: payments[0]?.createdAt || null,
        
        // Sonlar
        jamiSotuvlar: sales.length,
        faolQarzlar: qarzTarixi.filter(q => q.qolganQarz > 0).length,
        toliqTolanganlar: qarzTarixi.filter(q => q.status === "to'liq to'langan").length,
        jamiTolovlar: payments.length,
        
        // Status
        status: hozirgiQarz > 0 ? "qarzdor" : "to'liq to'langan",
        
        // Tarix
        qarzTarixi: qarzTarixi
      });
    }

    // Qarzga ko'ra saralash
    clientsWithDetails.sort((a, b) => b.hozirgiQarz - a.hozirgiQarz);

    // Umumiy statistika
    const totalStats = {
      jamiMijozlar: clientsWithDetails.length,
      qarzdorMijozlar: clientsWithDetails.filter(c => c.hozirgiQarz > 0).length,
      toliqTolaganlar: clientsWithDetails.filter(c => c.hozirgiQarz <= 0).length,
      jamiQarz: clientsWithDetails.reduce((sum, c) => sum + c.jamiQarz, 0),
      jamiTolangan: clientsWithDetails.reduce((sum, c) => sum + c.jamiTolangan, 0),
      hozirgiQarz: clientsWithDetails.reduce((sum, c) => sum + c.hozirgiQarz, 0),
      jamiSotuvlar: clientsWithDetails.reduce((sum, c) => sum + c.jamiSotuvlar, 0),
      jamiTolovlar: clientsWithDetails.reduce((sum, c) => sum + c.jamiTolovlar, 0)
    };

    res.json({
      success: true,
      statistics: totalStats,
      clients: clientsWithDetails
    });

  } catch (error) {
    console.error("❌ getAllDebtClientsDetailed xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Server xatoligi",
      error: error.message
    });
  }
};

// ============================================
// 4. BITTA MIJOZNING TO'LIQ MA'LUMOTI
// ============================================
export const getClientDebtDetails = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Mijozni topish
    let client = await DebtClient.findById(clientId).lean();
    let clientModel = "DebtClient";
    
    if (!client) {
      client = await Client.findById(clientId).lean();
      clientModel = "Client";
    }

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Mijoz topilmadi"
      });
    }

    // Qarz sotuvlar
    const sales = await Sale.find({
      client: clientId,
      tolov_turi: "qarz"
    })
      .populate("products.product", "nomi narxi")
      .sort({ createdAt: -1 })
      .lean();

    // To'lovlar
    const payments = await DebtPayment.find({ client: clientId })
      .populate("sale", "createdAt")
      .sort({ createdAt: -1 })
      .lean();

    let jamiQarz = 0;
    let jamiTolangan = 0;
    const qarzTarixi = [];

    for (const sale of sales) {
      let saleTotal = 0;
      const mahsulotlar = [];

      for (const p of sale.products) {
        const finalPrice = p.finalPrice || (p.narxi * p.miqdor);
        saleTotal += finalPrice;

        mahsulotlar.push({
          nomi: p.product?.nomi || "Noma'lum",
          miqdor: p.miqdor,
          narxi: p.narxi,
          jami: finalPrice
        });
      }

      const tolangan = Number(sale.total) || 0;
      const qolganQarz = saleTotal - tolangan;

      jamiQarz += saleTotal;
      jamiTolangan += tolangan;

      // Bu sale uchun to'lovlar
      const salePayments = payments
        .filter(p => p.sale?._id.toString() === sale._id.toString())
        .map(p => ({
          id: p._id,
          summa: p.tolovSummasi,
          sana: p.createdAt
        }));

      qarzTarixi.push({
        saleId: sale._id,
        sana: sale.createdAt,
        mahsulotlar: mahsulotlar,
        umumiyQarz: saleTotal,
        tolangan: tolangan,
        qolganQarz: qolganQarz,
        status: qolganQarz <= 0 ? "to'liq to'langan" : "qarzdor",
        tolovlar: salePayments
      });
    }

    res.json({
      success: true,
      client: {
        id: client._id,
        ism: client.ism,
        tel: client.tel,
        manzil: client.manzil || "",
        type: clientModel
      },
      statistics: {
        jamiQarz: jamiQarz,
        jamiTolangan: jamiTolangan,
        hozirgiQarz: jamiQarz - jamiTolangan,
        tolanganFoiz: jamiQarz > 0 ? Math.round((jamiTolangan / jamiQarz) * 100) : 0,
        jamiSotuvlar: sales.length,
        jamiTolovlar: payments.length,
        faolQarzlar: qarzTarixi.filter(q => q.qolganQarz > 0).length
      },
      qarzTarixi: qarzTarixi
    });

  } catch (error) {
    console.error("❌ getClientDebtDetails xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error.message
    });
  }
};