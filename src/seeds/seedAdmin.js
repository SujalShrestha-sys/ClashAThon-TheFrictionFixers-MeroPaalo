import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import connectDB from "../database/index.js";
import User from "../model/user.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL ;
    const password = process.env.ADMIN_PASSWORD ;


    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("Admin already exists. Skipping seed.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: "Super Admin",
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin seeded successfully!");
    console.log("Email:", email);
    console.log("Password:", password);

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();