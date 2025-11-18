import Sale from "../models/Sale.js";

export const getInvoiceByClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Ushbu mijozga tegishli barcha sotuvlarni topamiz
    const sales = await Sale.find({ client: clientId })
      .populate("client", "name phone")
      .populate("product", "name"); // mahsulot nomi kelishi uchun

    if (!sales.length) {
      return res.status(404).json({ message: "Ushbu mijoz uchun sotuvlar topilmadi" });
    }

    let products = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    // Har bir sotuvni yig‘ib chiqamiz
    sales.forEach((sale) => {
      totalAmount += sale.total;
      totalDiscount += sale.discountAmount;

      products.push({
        name: sale.product ? sale.product.name : "Mahsulot o‘chirilgan",
        qty: sale.miqdor,
        price: sale.narxi,
        total: sale.total,
      });
    });

    res.json({
      invoiceNumber: `INV-${clientId.slice(-6)}`,
      date: new Date(),
      client: {
        name: sales[0].client?.name || "Noma’lum mijoz",
        phone: sales[0].client?.phone || "---",
      },
      products,
      summary: {
        totalAmount,
        totalDiscount,
        finalAmount: totalAmount - totalDiscount,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Faktura chiqarishda xatolik",
      error: error.message,
    });
  }
};

export const getInvoiceBySale = async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = await Sale.findById(saleId)
      .populate("client", "name phone")
      .populate("product", "name");

    if (!sale) {
      return res.status(404).json({ message: "Faktura topilmadi" });
    }

    const invoice = {
      invoiceNumber: `INV-${saleId.slice(-6)}`,
      date: sale.createdAt,
      client: sale.client
        ? { name: sale.client.name, phone: sale.client.phone }
        : null,
      products: [
        {
          name: sale.product ? sale.product.name : "Mahsulot o‘chirilgan",
          qty: sale.miqdor,
          price: sale.narxi,
          total: sale.total
        }
      ],
      summary: {
        totalAmount: sale.total,
        totalDiscount: sale.discountAmount || 0,
        finalAmount: sale.total - (sale.discountAmount || 0)
      }
    };

    res.json(invoice);
  } catch (err) {
    res.status(500).json({
      message: "Faktura chiqarishda xatolik",
      error: err.message
    });
  }
};