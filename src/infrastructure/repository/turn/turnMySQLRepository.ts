import mysql from "mysql2/promise";
import { DomainError } from "../../../domain/error/domainError";
import { Board } from "../../../domain/model/turn/board";
import { toDisc } from "../../../domain/model/turn/disc";
import { Move } from "../../../domain/model/turn/move";
import { Point } from "../../../domain/model/turn/point";
import { Turn } from "../../../domain/model/turn/turn";
import { TurnRepository } from "../../../domain/model/turn/turnRepository";
import { MoveGateway } from "./moveGateway";
import { SquareGateway } from "./squareGateway";
import { TurnGateway } from "./turnGateway";

const turnGateway = new TurnGateway();
const moveGateway = new MoveGateway();
const squareGateway = new SquareGateway();

export class TurnMySQLRepository implements TurnRepository {
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
      throw new DomainError(
        "SpecifiedTurnNotFound",
        "Specified turn not found"
      );
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

    const nextDisc =
      turnRecord.nextDisc === null ? undefined : toDisc(turnRecord.nextDisc);

    return new Turn(
      gameId,
      turnCount,
      nextDisc,
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
