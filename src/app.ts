import express from "express";
import usersRouter from "./routes/users";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
app.use(express.json());
app.use("/api/users", usersRouter);
app.use("/api", (req, res) =>
  res.status(404).json({ message: "API endpoint not found" }),
);
app.use(notFound);
app.use(errorHandler);
export default app;
