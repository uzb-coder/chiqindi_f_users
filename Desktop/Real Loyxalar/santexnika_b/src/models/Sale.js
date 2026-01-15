import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        miqdor: { type: Number, required: true, min: 0.001 },
        narxi: { type: Number, required: true }, 
        original_narxi: { type: Number }, 
        discountPercent: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        finalPrice: { type: Number, required: true },
        isCostPrice: { type: Boolean, default: false } 
      },
    ],
    tolov_turi: {
      type: String,
      enum: ["naqd", "karta", "qarz", "aralash"], 
      required: true,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    qarz_miqdori: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    dollarRate: {
      type: Number,
      required: true,
      min: 0
    },

    promoCode: { type: String, default: null },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "clientModel",
      default: null,
    },

    clientModel: {
      type: String,
      enum: ["Client", "DebtClient", null],
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    izoh: { type: String, default: "" },
  },
  {
    timestamps: true,
    strictPopulate: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

saleSchema.virtual("haqiqiy_jami").get(function () {
  return this.products.reduce((sum, p) => sum + (p.finalPrice || 0), 0);
});

saleSchema.virtual("qolgan_qarz").get(function () {
  const jami = this.haqiqiy_jami || 0;
  const tolangan = this.total || 0;
  return jami - tolangan > 0 ? jami - tolangan : 0;
});

saleSchema.pre("save", function (next) {
  const jami = this.products.reduce((sum, p) => sum + p.finalPrice, 0);

  if (this.tolov_turi === "naqd" || this.tolov_turi === "karta") {
    this.total = jami;
    this.qarz_miqdori = 0;
  }

  else if (this.tolov_turi === "qarz") {
    this.total = 0;
    this.qarz_miqdori = jami;
  }

  else if (this.tolov_turi === "aralash") {
    const yigindi = (this.total || 0) + (this.qarz_miqdori || 0);
    if (Math.abs(yigindi - jami) > 1) {
      return next(
        new Error("Aralash to‘lovda total + qarz_miqdori umumiy summaga teng bo‘lishi kerak!")
      );
    }
  }

  next();
});

saleSchema.pre(/^find/, function (next) {
  this.populate({
    path: "products.product",
    select: "nomi narxi birligi ombordagi_soni",
  }).populate({
    path: "client",
    select: "ism tel manzil foiz promo_kod",
  });
  next();
});

export default mongoose.model("Sale", saleSchema);