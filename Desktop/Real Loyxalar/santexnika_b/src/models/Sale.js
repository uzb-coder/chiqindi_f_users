import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    miqdor: {
      type: Number,
      required: true,
    },
    // To‘lov turi: faqat naqd, karta, qarz
    tolov_turi: {
      type: String,
      enum: ["naqd", "karta", "qarz"],
      required: true,
    },
    narxi: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    qarz_miqdori: {
      type: Number,
      default: 0,
    },
    // Promo kod va chegirma
    promoCode: {
      type: String,
      default: null,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },

    // Mijoz: Client yoki DebtClient
    client: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "clientModel", // Dinamik ref
      default: null,
    },
    clientModel: {
      type: String,
      enum: ["Client", "DebtClient"],
      default: null,
    },
  },
  { timestamps: true }
);

// Avtomatik populate: product + client
saleSchema.pre(/^find/, function (next) {
  this.populate("product");
  this.populate({
    path: "client",
    select: "ism tel manzil foiz promo_kod", // kerakli maydonlar
  });
  next();
});

export default mongoose.model("Sale", saleSchema);