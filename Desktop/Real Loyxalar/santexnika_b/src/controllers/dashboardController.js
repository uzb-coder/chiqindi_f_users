import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import ExchangeRate from "../models/ExchangeRate.js";
import DebtClient from "../models/DebtClientModel.js";

export const getDashboardStats = async (req, res) => {
  try {
    console.log("📊 Dashboard so'rovi boshlandi");
    const { startDate, endDate } = req.query;
    console.log("📅 Tanlangan sana:", { startDate, endDate });

    // ✅ TO'G'RILANDI: Bugungi kun filtrini sozlash
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFilter = {
      createdAt: { $gte: today, $lt: tomorrow }
    };

    // ✅ TO'G'RILANDI: Tanlangan sana filtri
    const customDateFilter = startDate && endDate
      ? { 
          createdAt: { 
            $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)), 
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
          } 
        }
      : null;

    console.log("🔍 Filtrlar:", { 
      todayFilter, 
      customDateFilter 
    });

    const rateDoc = await ExchangeRate.findOne().sort({ updatedAt: -1 }).lean();
    const currentDollarRate = rateDoc?.usd || 12500;
   
    const totalProducts = await Product.countDocuments();

    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$ombordagi_soni" },
          totalCostValueUzs: { 
            $sum: { 
              $multiply: ["$tannarxi", "$ombordagi_soni", currentDollarRate] 
            } 
          },
          totalCostValueUsd: { 
            $sum: { 
              $multiply: ["$tannarxi", "$ombordagi_soni"] 
            } 
          }
        }
      }
    ]);

    const { 
      totalQuantity = 0, 
      totalCostValueUzs = 0, 
      totalCostValueUsd = 0 
    } = productStats[0] || {};

    // ✅ BUGUNGI SOTUV STATISTIKASI
    const todaySalesData = await Sale.aggregate([
      { $match: todayFilter },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalQuantity: { $sum: "$products.miqdor" },
          totalRevenue: { $sum: "$products.finalPrice" },
          grossProfitUzs: {
            $sum: {
              $subtract: [
                "$products.finalPrice", 
                { 
                  $multiply: [
                    "$products.miqdor", 
                    "$productInfo.tannarxi", 
                    "$dollarRate"
                  ] 
                }
              ] 
            }
          },
          grossProfitUsd: {
            $sum: {
              $subtract: [
                { $divide: ["$products.finalPrice", "$dollarRate"] },
                { $multiply: ["$products.miqdor", "$productInfo.tannarxi"] }
              ]
            }
          }
        }
      }
    ]);

    const todayStats = todaySalesData[0] || {
      totalSales: 0,
      totalQuantity: 0,
      totalRevenue: 0,
      grossProfitUzs: 0,
      grossProfitUsd: 0
    };

    console.log("✅ Bugungi sotuv:", todayStats);

    // Bugungi to'lov turlari
    const todayPaymentTypes = await Sale.aggregate([
      { $match: todayFilter },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$tolov_turi",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$products.finalPrice" }
        }
      }
    ]);

    let todayCash = { count: 0, totalRevenue: 0 };
    let todayCard = { count: 0, totalRevenue: 0 };
    let todayDebt = { count: 0, totalRevenue: 0 };
    let todayMixed = { count: 0, totalRevenue: 0 };

    todayPaymentTypes.forEach(item => {
      const type = item._id?.toLowerCase();
      if (type === "naqd" || type === "cash") {
        todayCash = item;
      } else if (type === "karta" || type === "card" || type === "pos") {
        todayCard = item;
      } else if (type === "qarz" || type === "debt") {
        todayDebt = item;
      } else if (type === "aralash" || type === "mixed") {
        todayMixed = item;
      }
    });

    // ✅ QARZLAR STATISTIKASI
    console.log("💰 Qarzlar statistikasini hisoblash...");
    
    const debtStats = await Sale.aggregate([
      { $match: { tolov_turi: "qarz" } },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: "$qarz_miqdori" },
          totalPaid: { $sum: { $ifNull: ["$qarz_tolangan", 0] } },
          totalDebtCount: { $sum: 1 }
        }
      }
    ]);

    const {
      totalDebt = 0,
      totalPaid = 0,
      totalDebtCount = 0
    } = debtStats[0] || {};

    const remainingDebt = totalDebt - totalPaid;

    console.log("✅ Qarzlar:", {
      jami: totalDebt,
      tolangan: totalPaid,
      qolgan: remainingDebt
    });

    // ✅ CHEGIRMA STATISTIKASI
    console.log("🎁 Chegirma statistikasini hisoblash...");
    
    const discountStats = await Sale.aggregate([
      { $match: { chegirma: { $exists: true, $gt: 0 } } },
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          totalDiscountedSales: { $sum: 1 },
          totalDiscount: { $sum: "$chegirma" },
          totalRevenue: { $sum: "$products.finalPrice" }
        }
      }
    ]);

    const {
      totalDiscountedSales = 0,
      totalDiscount = 0,
      totalRevenue: discountRevenue = 0
    } = discountStats[0] || {};

    console.log("✅ Chegirma:", {
      sotuvlar: totalDiscountedSales,
      chegirma: totalDiscount,
      daromad: discountRevenue
    });

    // ✅ TOP MIJOZLAR
    console.log("👥 Top mijozlarni olish...");
    
    const topClients = await Sale.aggregate([
      { $match: { client: { $ne: null } } },
      {
        $group: {
          _id: "$client",
          totalPurchases: { $sum: "$total" },
          purchaseCount: { $sum: 1 },
          totalDiscount: { $sum: { $ifNull: ["$chegirma", 0] } }
        }
      },
      { $sort: { totalPurchases: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "_id",
          as: "clientInfo"
        }
      },
      {
        $lookup: {
          from: "debtclients",
          localField: "_id",
          foreignField: "_id",
          as: "debtClientInfo"
        }
      },
      {
        $addFields: {
          clientData: {
            $cond: {
              if: { $gt: [{ $size: "$clientInfo" }, 0] },
              then: { $arrayElemAt: ["$clientInfo", 0] },
              else: { $arrayElemAt: ["$debtClientInfo", 0] }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          ism: "$clientData.ism",
          tel: "$clientData.tel",
          totalPurchases: 1,
          purchaseCount: 1,
          totalDiscount: 1
        }
      }
    ]);

    console.log(`✅ Top ${topClients.length} ta mijoz topildi`);

    // ✅ TANLANGAN DAVR STATISTIKASI
    let customStats = null;
    if (customDateFilter) {
      console.log("📊 Tanlangan davr statistikasini hisoblash...");
      console.log("🔍 Custom filter:", customDateFilter);
      
      const customSalesData = await Sale.aggregate([
        { $match: customDateFilter },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.product",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$tolov_turi",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$products.finalPrice" },
            totalQuantity: { $sum: "$products.miqdor" },
            grossProfitUzs: {
              $sum: {
                $subtract: [
                  "$products.finalPrice", 
                  { 
                    $multiply: [
                      "$products.miqdor", 
                      "$productInfo.tannarxi", 
                      "$dollarRate"
                    ] 
                  }
                ] 
              }
            },
            grossProfitUsd: {
              $sum: {
                $subtract: [
                  { $divide: ["$products.finalPrice", "$dollarRate"] },
                  { $multiply: ["$products.miqdor", "$productInfo.tannarxi"] }
                ]
              }
            }
          }
        }
      ]);

      console.log("📦 Custom sales data:", customSalesData);

      let cashSales = { count: 0, totalRevenue: 0 };
      let cardSales = { count: 0, totalRevenue: 0 };
      let debtSales = { count: 0, totalRevenue: 0 };
      let mixedSales = { count: 0, totalRevenue: 0 };
      let grossProfitUzs = 0;
      let grossProfitUsd = 0;
      let totalSales = 0;
      let totalQuantity = 0;
      let totalRevenue = 0;

      customSalesData.forEach(item => {
        const type = item._id?.toLowerCase();
        totalSales += item.count;
        totalQuantity += item.totalQuantity || 0;
        totalRevenue += item.totalRevenue || 0;
        grossProfitUzs += item.grossProfitUzs || 0;
        grossProfitUsd += item.grossProfitUsd || 0;

        if (type === "naqd" || type === "cash") {
          cashSales = item;
        } else if (type === "karta" || type === "card" || type === "pos") {
          cardSales = item;
        } else if (type === "qarz" || type === "debt") {
          debtSales = item;
        } else if (type === "aralash" || type === "mixed") {
          mixedSales = item;
        }
      });

      // Davr uchun top mahsulotlar
      const topProducts = await Sale.aggregate([
        { $match: customDateFilter },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.product",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$products.product",
            nomi: { $first: "$productInfo.nomi" },
            totalQuantity: { $sum: "$products.miqdor" },
            totalRevenue: { $sum: "$products.finalPrice" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]);

      // Davr uchun top mijozlar
      const periodTopClients = await Sale.aggregate([
        { $match: { ...customDateFilter, client: { $ne: null } } },
        {
          $group: {
            _id: "$client",
            totalPurchases: { $sum: "$total" },
            purchaseCount: { $sum: 1 }
          }
        },
        { $sort: { totalPurchases: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "clients",
            localField: "_id",
            foreignField: "_id",
            as: "clientInfo"
          }
        },
        {
          $lookup: {
            from: "debtclients",
            localField: "_id",
            foreignField: "_id",
            as: "debtClientInfo"
          }
        },
        {
          $addFields: {
            clientData: {
              $cond: {
                if: { $gt: [{ $size: "$clientInfo" }, 0] },
                then: { $arrayElemAt: ["$clientInfo", 0] },
                else: { $arrayElemAt: ["$debtClientInfo", 0] }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            ism: "$clientData.ism",
            tel: "$clientData.tel",
            totalPurchases: 1,
            purchaseCount: 1
          }
        }
      ]);

      customStats = {
        totalSales,
        totalQuantity,
        totalRevenue,
        grossProfit: {
          uzs: Math.round(grossProfitUzs),
          usd: Number(grossProfitUsd.toFixed(2))
        },
        cashSales,
        cardSales,
        debtSales,
        mixedSales,
        topProducts,
        topClients: periodTopClients
      };

      console.log("✅ Tanlangan davr:", customStats);
    }

    // Javobni yuborish
    const responseData = {
      success: true,
      data: {
        currentDollarRate,
        totalProducts,
        totalQuantity,
        totalCostValue: {
          uzs: Math.round(totalCostValueUzs),
          usd: Number(totalCostValueUsd.toFixed(2))
        },
        today: {
          totalSales: todayStats.totalSales,
          totalQuantity: todayStats.totalQuantity,
          totalRevenue: todayStats.totalRevenue,
          grossProfit: {
            uzs: Math.round(todayStats.grossProfitUzs),
            usd: Number(todayStats.grossProfitUsd.toFixed(2))
          },
          cashSales: todayCash,
          cardSales: todayCard,
          debtSales: todayDebt,
          mixedSales: todayMixed
        },
        filtered: customStats,
        debt: {
          totalDebt,
          totalPaid,
          remainingDebt,
          totalDebtCount
        },
        discount: {
          totalDiscountedSales,
          totalDiscount,
          totalRevenue: discountRevenue
        },
        topClients
      }
    };

    console.log("✅ Dashboard ma'lumotlari muvaffaqiyatli yuborildi");
    res.status(200).json(responseData);

  } catch (error) {
    console.error("❌ Dashboard xatosi:", error);
    console.error("📋 Xato tafsilotlari:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({
      success: false,
      message: "Dashboard ma'lumotlarini olishda xatolik yuz berdi",
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack 
      })
    });
  }
};