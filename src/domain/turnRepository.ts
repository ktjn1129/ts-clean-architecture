import mysql from "mysql2/promise";
import { Turn } from "./turn";
import { TurnGateway } from "../dataaccess/turnGateway";
import { SquareGateway } from "../dataaccess/squareGateway";
import { MoveGateway } from "../dataaccess/moveGateway";
import { Move } from "./move";
import { toDisc } from "./disc";
import { Point } from "./point";
import { Board } from "./board";

const turnGateway = new TurnGateway();
const moveGateway = new MoveGateway();
const squareGateway = new SquareGateway();

export class TurnRepository {
  async findForGameIdAndTurnCount(
    connection: mysql.Connection,
    gameId: number,
    turnCount: number
  ): Promise<Turn> {
    const turnRecord = await turnGateway.findForGameIdAndTurnCount(
      connection,
      gameId,
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

    const moveRecord = await moveGateway.findForTurnId(
      connection,
      turnRecord.id
    );
    let move: Move | undefined;
    if (moveRecord) {
      move = new Move(
        toDisc(moveRecord.disc),
        new Point(moveRecord.x, moveRecord.y)
      );
    }

    return new Turn(
      gameId,
      turnCount,
      toDisc(turnRecord.nextDisc),
      move,
      new Board(board),
      turnRecord.endAt
    );
  }

  async save(connection: mysql.Connection, turn: Turn) {
    const turnRecord = await turnGateway.insert(
      connection,
      turn.gameId,
      turn.turnCount,
      turn.nextDisc,
      turn.endAt
    );

    await squareGateway.insertAll(connection, turnRecord.id, turn.board.discs);

    if (turn.move) {
      await moveGateway.insert(
        connection,
        turnRecord.id,
        turn.move.disc,
        turn.move.point.x,
        turn.move.point.y
      );
    }
  }
}
