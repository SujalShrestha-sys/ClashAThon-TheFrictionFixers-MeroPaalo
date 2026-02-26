import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}`,
    );

    console.log(`Connection successful: ${connectionInstance.connection.host}`);
  } catch (err) {
    console.log("Failed to connect database, ", err.message);
  }
};

export default connectDB;
