import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Client from "../models/clientModel.js";
import DebtClient from "../models/DebtClientModel.js";
import Expense from "../models/Expense.js";
import Return from "../models/ReturnProduc.js";
import Invoice from "../models/invoiceModel.js";

export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Sana filtrlari
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // ================== SOTUV STATISTIKASI ==================
    const totalSales = await Sale.countDocuments(dateFilter);

    const salesData = await Sale.aggregate([
      { $match: dateFilter },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$_id",
          saleTotal: { $sum: "$products.finalPrice" },
          tolov_turi: { $first: { $toLower: "$tolov_turi" } },
          qarz_miqdori: { $first: "$qarz_miqdori" },
          createdAt: { $first: "$createdAt" }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$saleTotal" },
          totalPaid: {
            $sum: {
              $cond: [
                { $in: ["$tolov_turi", ["naqd", "cash", "karta", "card", "terminal", "pos", "plastik"]] },
                "$saleTotal",
                0
              ]
            }
          },
          totalDebt: {
            $sum: {
              $cond: [
                { $in: ["$tolov_turi", ["qarz", "debt"]] },
                { $ifNull: ["$qarz_miqdori", "$saleTotal"] },
                0
              ]
            }
          },
          cashSales: {
            $sum: {
              $cond: [{ $in: ["$tolov_turi", ["naqd", "cash"]] }, "$saleTotal", 0]
            }
          },
          cardSales: {
            $sum: {
              $cond: [
                { $in: ["$tolov_turi", ["karta", "card", "terminal", "pos", "plastik"]] },
                "$saleTotal",
                0
              ]
            }
          },
          debtSales: {
            $sum: {
              $cond: [{ $in: ["$tolov_turi", ["qarz", "debt"]] }, "$saleTotal", 0]
            }
          }
        }
      }
    ]);

    const salesStats = salesData[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDebt: 0,
      cashSales: 0,
      cardSales: 0,
      debtSales: 0
    };

    // Kunlik sotuv grafigi (oxirgi 30 kun)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: "$products" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$products.finalPrice" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Eng ko'p sotilgan mahsulotlar
    const topProducts = await Sale.aggregate([
      { $match: dateFilter },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.miqdor" },
          totalRevenue: { $sum: "$products.finalPrice" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          nomi: "$productInfo.nomi",
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    // ================== MAHSULOT STATISTIKASI ==================
    const totalProducts = await Product.countDocuments();

    // ✅ YANGI: Birlik bo'yicha (kg/dona/metr) alohida statistika
    const productStatsByType = await Product.aggregate([
      {
        $group: {
          _id: { $toLower: { $ifNull: ["$birligi", "dona"] } },
          totalValue: { $sum: { $multiply: ["$narxi", "$ombordagi_soni"] } },
          totalQuantity: { $sum: "$ombordagi_soni" },
          count: { $sum: 1 },
          lowStock: { $sum: { $cond: [{ $lt: ["$ombordagi_soni", 10] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $eq: ["$ombordagi_soni", 0] }, 1, 0] } }
        }
      }
    ]);

    // Birlik bo'yicha ma'lumotlarni formatlash
    const stockByType = {
      kg: { totalQuantity: 0, totalValue: 0, count: 0, lowStock: 0, outOfStock: 0 },
      dona: { totalQuantity: 0, totalValue: 0, count: 0, lowStock: 0, outOfStock: 0 },
      metr: { totalQuantity: 0, totalValue: 0, count: 0, lowStock: 0, outOfStock: 0 }
    };

    let totalValue = 0;
    let totalQuantity = 0;
    let lowStock = 0;
    let outOfStock = 0;

    productStatsByType.forEach(item => {
      const type = item._id;
      if (stockByType[type]) {
        stockByType[type] = {
          totalQuantity: item.totalQuantity,
          totalValue: item.totalValue,
          count: item.count,
          lowStock: item.lowStock,
          outOfStock: item.outOfStock
        };
      } else {
        // Agar yangi birlik bo'lsa, dinamik qo'shish
        stockByType[type] = {
          totalQuantity: item.totalQuantity,
          totalValue: item.totalValue,
          count: item.count,
          lowStock: item.lowStock,
          outOfStock: item.outOfStock
        };
      }
      totalValue += item.totalValue;
      totalQuantity += item.totalQuantity;
      lowStock += item.lowStock;
      outOfStock += item.outOfStock;
    });

    const productInfo = {
      totalValue,
      totalQuantity,
      lowStock,
      outOfStock,
      byType: stockByType // ✅ YANGI: tur bo'yicha
    };

    const lowStockProducts = await Product.find({ ombordagi_soni: { $lt: 10, $gt: 0 } })
      .sort({ ombordagi_soni: 1 })
      .limit(10);

    const outOfStockProducts = await Product.find({ ombordagi_soni: 0 }).limit(10);

    // ================== MIJOZ STATISTIKASI ==================
    const totalClients = await Client.countDocuments();
    const totalDebtClients = await DebtClient.countDocuments();

    const debtClientsData = await DebtClient.aggregate([
      {
        $project: {
          ism: 1,
          tel: 1,
          totalDebt: { $sum: "$qarzlar.miqdor" }
        }
      },
      {
        $group: {
          _id: null,
          totalDebtAmount: { $sum: "$totalDebt" },
          clientsWithDebt: { $sum: { $cond: [{ $gt: ["$totalDebt", 0] }, 1, 0] } }
        }
      }
    ]);

    const debtInfo = debtClientsData[0] || { totalDebtAmount: 0, clientsWithDebt: 0 };

    const topDebtors = await DebtClient.aggregate([
      {
        $project: {
          ism: 1,
          tel: 1,
          manzil: 1,
          totalDebt: { $sum: "$qarzlar.miqdor" },
          debtCount: { $size: "$qarzlar" }
        }
      },
      { $match: { totalDebt: { $gt: 0 } } },
      { $sort: { totalDebt: -1 } },
      { $limit: 10 }
    ]);

    // ================== ENG FAOL MIJOZLAR (TOP BUYERS) ==================
    const topActiveClients = await Sale.aggregate([
      { $match: dateFilter },
      { 
        $match: { 
          client: { $exists: true, $ne: null } 
        } 
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$client",
          totalPurchases: { $sum: "$products.finalPrice" },
          purchaseCount: { $sum: 1 },
          totalQuantity: { $sum: "$products.miqdor" },
          lastPurchase: { $max: "$createdAt" }
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
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "debtclients",
          let: { clientTel: "$clientInfo.tel" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$tel", "$$clientTel"] } 
              } 
            },
            {
              $project: {
                totalDebt: { $sum: "$qarzlar.miqdor" }
              }
            }
          ],
          as: "debtInfo"
        }
      },
      {
        $project: {
          ism: { $ifNull: ["$clientInfo.ism", "Noma'lum Mijoz"] },
          tel: { $ifNull: ["$clientInfo.tel", "N/A"] },
          manzil: { $ifNull: ["$clientInfo.manzil", "N/A"] },
          type: { $ifNull: ["$clientInfo.type", "regular"] },
          foiz: { $ifNull: ["$clientInfo.foiz", 0] },
          totalPurchases: 1,
          purchaseCount: 1,
          totalQuantity: 1,
          lastPurchase: 1,
          currentDebt: { 
            $ifNull: [
              { $arrayElemAt: ["$debtInfo.totalDebt", 0] }, 
              0
            ] 
          },
          averagePurchase: { 
            $round: [
              { $divide: ["$totalPurchases", "$purchaseCount"] }, 
              2
            ] 
          }
        }
      }
    ]);

    // ================== HARAJAT STATISTIKASI ==================
    const expenseData = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$summa" },
          count: { $sum: 1 }
        }
      }
    ]);

    const expenseStats = expenseData[0] || { totalExpenses: 0, count: 0 };

    const expensesByCategory = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$nomi",
          total: { $sum: "$summa" },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // ================== QAYTARILGAN MAHSULOTLAR ==================
    const returnData = await Return.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: null,
          totalReturns: { $sum: 1 },
          totalReturnValue: { $sum: { $multiply: ["$miqdor", "$productInfo.narxi"] } },
          totalQuantity: { $sum: "$miqdor" }
        }
      }
    ]);

    const returnStats = returnData[0] || { totalReturns: 0, totalReturnValue: 0, totalQuantity: 0 };

    const topReturns = await Return.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$product",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$miqdor" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" }
    ]);

    // ================== INVOICE STATISTIKASI ==================
    const invoiceData = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" }
        }
      }
    ]);

    const invoiceStats = {
      issued: 0,
      paid: 0,
      partial: 0,
      issuedAmount: 0,
      paidAmount: 0,
      partialAmount: 0
    };

    invoiceData.forEach(item => {
      invoiceStats[item._id] = item.count;
      invoiceStats[`${item._id}Amount`] = item.totalAmount;
    });

    // ================== FOYDA HISOBLASH ==================
    const totalIncome = salesStats.totalPaid - returnStats.totalReturnValue;
    const totalExpense = expenseStats.totalExpenses;
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0;

    // ================== OYLIK STATISTIKA ==================
    const monthlyStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
        }
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$products.finalPrice" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // ================== JAVOB ==================
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalSales,
          totalRevenue: salesStats.totalRevenue,
          totalPaid: salesStats.totalPaid,
          totalDebt: salesStats.totalDebt,
          totalExpenses: expenseStats.totalExpenses,
          netProfit,
          profitMargin: parseFloat(profitMargin),
          totalClients: totalClients + totalDebtClients,
          totalProducts,
          totalProductValue: productInfo.totalValue
        },
        sales: {
          total: totalSales,
          byPaymentMethod: {
            cash: salesStats.cashSales,
            card: salesStats.cardSales,
            debt: salesStats.debtSales
          },
          daily: dailySales,
          monthly: monthlyStats,
          topProducts
        },
        products: {
          total: totalProducts,
          totalValue: productInfo.totalValue,
          totalQuantity: productInfo.totalQuantity,
          lowStockCount: productInfo.lowStock,
          outOfStockCount: productInfo.outOfStock,
          byUnit: productInfo.byType,
          lowStockProducts,
          outOfStockProducts
        },
        clients: {
          totalClients,
          totalDebtClients,
          clientsWithDebt: debtInfo.clientsWithDebt,
          totalDebtAmount: debtInfo.totalDebtAmount + salesStats.totalDebt,
          topDebtors,
          // ✅ YANGI: Eng faol mijozlar
          topActiveClients
        },
        expenses: {
          total: expenseStats.totalExpenses,
          count: expenseStats.count,
          byCategory: expensesByCategory
        },
        returns: {
          total: returnStats.totalReturns,
          totalValue: returnStats.totalReturnValue,
          totalQuantity: returnStats.totalQuantity,
          topReturns
        },
        invoices: invoiceStats,
        financial: {
          income: totalIncome,
          expenses: totalExpense,
          profit: netProfit,
          profitMargin: parseFloat(profitMargin),
          debtReceivable: salesStats.totalDebt + debtInfo.totalDebtAmount
        }
      }
    });

  } catch (error) {
    console.error("Dashboard xatosi:", error);
    res.status(500).json({
      success: false,
      message: "Dashboard ma'lumotlarini olishda xatolik",
      error: error.message
    });
  }
};