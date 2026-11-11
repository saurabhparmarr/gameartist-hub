import mongoose from "mongoose";

const connectDB = async () => {
  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: process.env.NODE_ENV !== "production",
  });
  console.log(`MongoDB connected: ${connection.connection.host}`);
};

export default connectDB;
