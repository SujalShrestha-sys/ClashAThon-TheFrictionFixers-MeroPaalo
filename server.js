import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";

import connectDB from "./src/database/index.js";
import { notFound, errorHandler } from "./src/middlewares/error.middleware.js";

import router from "./src/routes/routes.js";

dotenv.config({ path: "./.env" });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser())

app.get("/", (req, res) => {
  res.send("Queue backend running");
});

// API routes
app.use('/api',router)

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] },
    });

    app.set("io", io);

    io.on("connection", (socket) => {
      socket.on("joinDepartment", ({ institutionId, departmentId }) => {
        if (institutionId && departmentId)
          socket.join(`inst:${institutionId}:dept:${departmentId}`);
      });

      socket.on("joinToken", ({ institutionId, tokenId }) => {
        if (institutionId && tokenId)
          socket.join(`inst:${institutionId}:token:${tokenId}`);
      });

      socket.on("leaveDepartment", ({ institutionId, departmentId }) => {
        if (institutionId && departmentId)
          socket.leave(`inst:${institutionId}:dept:${departmentId}`);
      });

      socket.on("leaveToken", ({ institutionId, tokenId }) => {
        if (institutionId && tokenId)
          socket.leave(`inst:${institutionId}:token:${tokenId}`);
      });
    });

    server.listen(port, () =>
      console.log(`App is listening at http://localhost:${port}`),
    );
  })
  .catch((err) => {
    console.log("Error connecting DB,", err.message);
    process.exit(1);
  });
