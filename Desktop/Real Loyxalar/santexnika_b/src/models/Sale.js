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
        narxi: { type: Number, required: true }, // sotuvdagi ko‘rsatilgan narx
        original_narxi: { type: Number }, // ombordagi asl narx (foyda hisoblash uchun)
        discountPercent: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        finalPrice: { type: Number, required: true }, // chegirmadan keyingi yakuniy narx * miqdor
      },
    ],

    // To‘lov turi: naqd, ka1
    // rta, qarz, aralash
    tolov_turi: {
      type: String,
      enum: ["naqd", "karta", "qarz", "aralash"], // "aralash" qo‘shildi
      required: true,
    },

    // Haqiqatda to‘langan pul (naqd/karta/aralashda)
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Qarzga olingan qismi (faqat "qarz" va "aralash"da > 0)
    qarz_miqdori: {
      type: Number,
      min: 0,
      default: 0,
    },

    promoCode: { type: String, default: null },

    // Mijoz (promo yoki qarzdor)
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

    // Qo‘shimcha izoh (masalan, to‘lov haqida yoki mijoz haqida)
    izoh: { type: String, default: "" },
  },
  {
    timestamps: true,
    strictPopulate: false,
    // Virtual field: haqiqiy jami summa (chegirmadan keyin)
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: sotuvning haqiqiy jami summasi (barcha finalPrice lar yig‘indisi)
saleSchema.virtual("haqiqiy_jami").get(function () {
  return this.products.reduce((sum, p) => sum + (p.finalPrice || 0), 0);
});

// Virtual: hozirgi qarz miqdori (haqiqiy_jami - total)
saleSchema.virtual("qolgan_qarz").get(function () {
  const jami = this.haqiqiy_jami || 0;
  const tolangan = this.total || 0;
  return jami - tolangan > 0 ? jami - tolangan : 0;
});

// Agar "aralash" bo‘lsa, qarz_miqdori va total o‘rtasidagi muvofiqlikni tekshirish
saleSchema.pre("save", function (next) {
  const jami = this.products.reduce((sum, p) => sum + p.finalPrice, 0);

  // Agar tolov_turi "naqd" yoki "karta" bo‘lsa → total = jami bo‘lishi kerak
  if (this.tolov_turi === "naqd" || this.tolov_turi === "karta") {
    this.total = jami;
    this.qarz_miqdori = 0;
  }

  // "qarz" bo‘lsa → total = 0, qarz_miqdori = jami
  else if (this.tolov_turi === "qarz") {
    this.total = 0;
    this.qarz_miqdori = jami;
  }

  // "aralash" bo‘lsa → total + qarz_miqdori ≈ jami (1 so‘m xato ruxsat)
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

// Populate middleware
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