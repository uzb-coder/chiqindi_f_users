import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        miqdor: { type: Number, required: true },
        narxi: { type: Number, required: true },
        discountPercent: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        finalPrice: { type: Number, required: true },
      }
    ],
    tolov_turi: {
      type: String,
      enum: ["naqd", "karta", "qarz"],
      required: true,
    },
    total: { type: Number, required: true },
    qarz_miqdori: { type: Number, default: 0 },
    promoCode: { type: String, default: null },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "clientModel",
      default: null,
    },
    clientModel: {
      type: String,
      enum: ["Client", "DebtClient"],
      default: null,
    },
  },
  { timestamps: true, strictPopulate: false } // <-- populate xatolik bermasligi uchun
);

// Populate products va client
saleSchema.pre(/^find/, function(next) {
  this.populate({
    path: "products.product",
    model: "Product"
  });

  this.populate({
    path: "client",
    select: "ism tel manzil foiz promo_kod",
  });

  next();
});

export default mongoose.model("Sale", saleSchema);
