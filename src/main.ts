import express from "express";
import "express-async-errors";
import morgan from "morgan";
import mysql from "mysql2/promise";

const PORT = 3000;

const app = express();

app.use(morgan("dev"));
app.use(express.static("static", { extensions: ["html"] }));

app.get("/api/hello", async (req, res) => {
  res.json({
    message: "Hello World!",
  });
});

app.get("/api/error", async (req, res) => {
  throw new Error("Error endpoint");
});

app.post("/api/games", async (req, res) => {
  const startedAt = new Date();

  console.log(`startedAt: ${startedAt}`);
  const connect = await mysql.createConnection({
    host: "localhost",
    database: "reversi",
    user: "reversi",
    password: "password",
  });

  try {
    await connect.beginTransaction();
    await connect.execute("insert into games (started_at) values (?)", [
      startedAt,
    ]);
    await connect.commit();
  } finally {
    await connect.end();
  }

  res.status(201).end();
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Reversi application started: http://localhost:${PORT}`);
});

function errorHandler(
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  console.error("Unexpected error occurred", err);
  res.status(500).send({
    message: "Unexpected error occurred",
  });
}
