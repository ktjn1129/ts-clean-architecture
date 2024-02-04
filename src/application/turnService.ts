import { GameGateway } from "../dataaccess/gameGateway";
import { TurnGateway } from "../dataaccess/turnGateway";
import { SquareGateway } from "../dataaccess/squareGateway";
import { connectMySQL } from "../dataaccess/connection";
import { MoveGateway } from "../dataaccess/moveGateway";
import { Board } from "../domain/board";
import { Turn } from "../domain/turn";
import { toDisc } from "../domain/disc";
import { Point } from "../domain/point";

const gameGateway = new GameGateway();
const turnGateway = new TurnGateway();
const moveGateway = new MoveGateway();
const squareGateway = new SquareGateway();

class FindLatestGameTurnByTurnCountOutput {
  constructor(
    private _turnCount: number,
    private _board: number[][],
    private _nextDisc: number | undefined,
    private _winnerDisc: number | undefined
  ) {}

  get turnCount() {
    return this._turnCount;
  }

  get board() {
    return this._board;
  }

  get nextDisc() {
    return this._nextDisc;
  }

  get winnerDisc() {
    return this._winnerDisc;
  }
}

export class TurnService {
  async findLatestGameByTurnCount(
    turnCount: number
  ): Promise<FindLatestGameTurnByTurnCountOutput> {
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

      return new FindLatestGameTurnByTurnCountOutput(
        turnCount,
        board,
        turnRecord.nextDisc,
        undefined
      );
    } finally {
      await connection.end();
    }
  }

  async registerTurn(turnCount: number, disc: number, x: number, y: number) {
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

      const previousTurn = new Turn(
        gameRecord.id,
        previousTurnCount,
        toDisc(previousTurnRecord.nextDisc),
        undefined,
        new Board(board),
        previousTurnRecord.endAt
      );

      //石を置く
      const newTurn = previousTurn.placeNext(toDisc(disc), new Point(x, y));

      //ターンを保存する
      const turnRecord = await turnGateway.insert(
        connection,
        newTurn.gameId,
        newTurn.turnCount,
        newTurn.nextDisc,
        newTurn.endAt
      );

      await squareGateway.insertAll(
        connection,
        turnRecord.id,
        newTurn.board.discs
      );

      await moveGateway.insert(connection, turnRecord.id, disc, x, y);

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
