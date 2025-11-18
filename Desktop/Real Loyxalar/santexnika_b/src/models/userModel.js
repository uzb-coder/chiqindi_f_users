import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    ism: {
      type: String,
      required: true
    },
    familya: {
      type: String,
      required: true
    },
    login: {
      type: String,
      required: true,
      unique: true
    },
    parol: {
      type: String,
      required: true
    },
    rol: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
