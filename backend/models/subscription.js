import mongoose from "mongoose";

// Tracks every Razorpay order + completed subscription.
// The same document is created as "PENDING" when the order is created and
// promoted to "ACTIVE" once payment is verified — the status guard is what
// prevents a payment from being processed twice.
const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  planName: {
    type: String,
    enum: ["FREE", "BRONZE", "SILVER", "GOLD"],
    required: true,
  },
  amount: { type: Number, required: true }, // in INR
  paymentId: { type: String, default: null },
  orderId: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, default: null },
  status: {
    type: String,
    enum: ["PENDING", "ACTIVE", "FAILED", "REFUNDED"],
    default: "PENDING",
  },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Subscription", SubscriptionSchema);
