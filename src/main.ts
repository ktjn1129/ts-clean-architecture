import express from "express";
import "express-async-errors";
import morgan from "morgan";
import mysql from "mysql2/promise";

const EMPTY = 0;
const DARK = 1;
const LIGHT = 2;

const INITIAL_BOARD = [
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, DARK, LIGHT, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, LIGHT, DARK, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
];

const PORT = 5000;

const app = express();

app.use(morgan("dev"));
app.use(express.static("static", { extensions: ["html"] }));
app.use(express.json());

app.get("/api/hello", async (req, res) => {
  res.json({
    message: "Hello World!",
  });
});

app.get("/api/error", async (req, res) => {
  throw new Error("Error endpoint");
});

app.post("/api/games", async (req, res) => {
  const now = new Date();
  const connection = await connectMySQL();

  try {
    await connection.beginTransaction();

    const gameInsertResult = await connection.execute<mysql.ResultSetHeader>(
      "insert into games (started_at) values (?)",
      [now]
    );
    const gameId = gameInsertResult[0].insertId;

    const turnInsertResult = await connection.execute<mysql.ResultSetHeader>(
      "insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)",
      [gameId, 0, DARK, now]
    );
    const turnId = turnInsertResult[0].insertId;

    //マス目の数を計算
    const squareCount = INITIAL_BOARD.map((line) => line.length).reduce(
      (v1, v2) => v1 + v2,
      0
    );
    const squareInsertSql =
      "insert into squares (turn_id, x, y, disc) values" +
      Array.from(Array(squareCount))
        .map(() => "(?, ?, ?, ?)")
        .join(", ");

    const squaresInsertValues: any[] = [];
    INITIAL_BOARD.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId);
        squaresInsertValues.push(x);
        squaresInsertValues.push(y);
        squaresInsertValues.push(disc);
      });
    });
    await connection.execute(squareInsertSql, squaresInsertValues);
    await connection.commit();
  } finally {
    await connection.end();
  }

  res.status(201).end();
});

app.get('/api/games/latest/turns/:turnCount', async(req, res) => {
  const turnCount = parseInt(req.params.turnCount);
  const connection = await connectMySQL();

  try {
    const gameSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, started_at from games order by id desc limit 1"
    )
    const game = gameSelectResult[0][0];

    const turnSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?",
      [game['id'], turnCount]
    )
    const turn = turnSelectResult[0][0];

    const squaresSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, turn_id, x, y, disc from squares where turn_id = ?",
      [turn['id']]
    )
    const squares = squaresSelectResult[0];

    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))

    squares.forEach((s) => {
      board[s.y][s.x] = s.disc;
    })

    const responseBody = {
      turnCount,
      board,
      nextDisc: turn['next_disc'],
      winnerDisc: null
    }
    res.json(responseBody)
  }finally {
    await connection.end();
  }
})

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Reversi application started: http://localhost:${PORT}`);
});

app.post('/api/games/latest/turns', async(req, res) => {
  const turnCount = parseInt(req.body.turnCount);
  const disc = parseInt(req.body.move.disc);
  const x = parseInt(req.body.move.x);
  const y = parseInt(req.body.move.y);

  const connection = await connectMySQL();

  try {
     //一つ前のターンを取得
    const gameSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, started_at from games order by id desc limit 1"
    );
    const game = gameSelectResult[0][0];

    const previousTurnCount = turnCount - 1;
    const turnSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?",
      [game['id'], previousTurnCount]
    );
    const turn = turnSelectResult[0][0];

    const squaresSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, turn_id, x, y, disc from squares where turn_id = ?",
      [turn['id']]
    );
    const squares = squaresSelectResult[0];

    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))

    squares.forEach((s) => {
      board[s.y][s.x] = s.disc;
    });

    //石を置く
    board[y][x] = disc;

    //ターンを保存する
    const nextDisc = disc === DARK ? LIGHT : DARK;
    const now = new Date();
    const turnInsertResult = await connection.execute<mysql.ResultSetHeader>(
      "insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)",
      [game['id'], turnCount, nextDisc, now]
    );
    const turnId = turnInsertResult[0].insertId;

    const squareCount = board.map((line) => line.length).reduce(
      (v1, v2) => v1 + v2,
      0
    );
    const squareInsertSql =
      "insert into squares (turn_id, x, y, disc) values" +
      Array.from(Array(squareCount))
        .map(() => "(?, ?, ?, ?)")
        .join(", ");

    const squaresInsertValues: any[] = [];
    board.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId);
        squaresInsertValues.push(x);
        squaresInsertValues.push(y);
        squaresInsertValues.push(disc);
      });
    });
    await connection.execute(squareInsertSql, squaresInsertValues);

    await connection.execute(
      "insert into moves (turn_id, disc, x, y) values (?, ?, ?, ?)",
      [turnId, disc, x, y]
    );

    await connection.commit();

  }finally {
    await connection.end();
  }

  res.status(201).end();
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

async function connectMySQL() {
  return await mysql.createConnection({
    host: "localhost",
    database: "reversi",
    user: "reversi",
    password: "password",
  });
}