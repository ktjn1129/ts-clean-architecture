import express from "express";
import { GameGateway } from "../dataaccess/gameGateway";
import { TurnGateway } from "../dataaccess/turnGateway";
import { MoveGateway } from "../dataaccess/moveGateway";
import { SquareGateway } from "../dataaccess/squareGateway";
import { connectMySQL } from "../dataaccess/connection";
import { DARK, LIGHT } from "../application/constants";

export const turnRouter = express.Router();

const gameGateway = new GameGateway();
const turnGateway = new TurnGateway();
const moveGateway = new MoveGateway();
const squareGateway = new SquareGateway();

turnRouter.get("/api/games/latest/turns/:turnCount", async (req, res) => {
  const turnCount = parseInt(req.params.turnCount);
  const connection = await connectMySQL();

  try {
    const gameRecord = await gameGateway.findLatest(connection);
    if (!gameRecord) {
      throw new Error("Latest game not found");
    }

    const turnRecord = await turnGateway.findForGameIdAndTurnCount(
      connection,
      gameRecord.id,
      turnCount
    );
    if (!turnRecord) {
      throw new Error("Specified turn not found");
    }

    const squareRecords = await squareGateway.findForTurnId(
      connection,
      turnRecord.id
    );
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)));

    squareRecords.forEach((square) => {
      board[square.y][square.x] = square.disc;
    });

    const responseBody = {
      turnCount,
      board,
      nextDisc: turnRecord.nextDisc,
      winnerDisc: null,
    };
    res.json(responseBody);
  } finally {
    await connection.end();
  }
});

turnRouter.post("/api/games/latest/turns", async (req, res) => {
  const turnCount = parseInt(req.body.turnCount);
  const disc = parseInt(req.body.move.disc);
  const x = parseInt(req.body.move.x);
  const y = parseInt(req.body.move.y);

  const connection = await connectMySQL();

  try {
    //一つ前のターンを取得
    const gameRecord = await gameGateway.findLatest(connection);
    if (!gameRecord) {
      throw new Error("Latest game not found");
    }

    const previousTurnCount = turnCount - 1;
    const previousTurnRecord = await turnGateway.findForGameIdAndTurnCount(
      connection,
      gameRecord.id,
      previousTurnCount
    );
    if (!previousTurnRecord) {
      throw new Error("Specified turn not found");
    }

    const squaresRecords = await squareGateway.findForTurnId(
      connection,
      previousTurnRecord.id
    );

    const board = Array.from(Array(8)).map(() => Array.from(Array(8)));

    squaresRecords.forEach((s) => {
      board[s.y][s.x] = s.disc;
    });

    // TODO 盤面に置けるかチェック

    //石を置く
    board[y][x] = disc;

    // TODO ひっくり返す

    //ターンを保存する
    const nextDisc = disc === DARK ? LIGHT : DARK;
    const now = new Date();

    const turnRecord = await turnGateway.insert(
      connection,
      gameRecord.id,
      turnCount,
      nextDisc,
      now
    );
    await squareGateway.insertAll(connection, turnRecord.id, board);
    await moveGateway.insert(connection, turnRecord.id, disc, x, y);

    await connection.commit();
  } finally {
    await connection.end();
  }

  res.status(201).end();
});
