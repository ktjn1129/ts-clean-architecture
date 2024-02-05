import { connectMySQL } from "../dataaccess/connection";
import { GameGateway } from "../dataaccess/gameGateway";
import { toDisc } from "../domain/disc";
import { Point } from "../domain/point";
import { TurnRepository } from "../domain/turnRepository";

const gameGateway = new GameGateway();

const turnRepository = new TurnRepository();

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

      const turn = await turnRepository.findForGameIdAndTurnCount(
        connection,
        gameRecord.id,
        turnCount
      );

      return new FindLatestGameTurnByTurnCountOutput(
        turnCount,
        turn.board.discs,
        turn.nextDisc,
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

      const previousTurn = await turnRepository.findForGameIdAndTurnCount(
        connection,
        gameRecord.id,
        previousTurnCount
      );

      //石を置く
      const newTurn = previousTurn.placeNext(toDisc(disc), new Point(x, y));

      //ターンを保存する
      await turnRepository.save(connection, newTurn);

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
