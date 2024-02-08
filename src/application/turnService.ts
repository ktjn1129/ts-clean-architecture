import { connectMySQL } from "../infrastructure/connection";
import { GameGateway } from "../infrastructure/gameGateway";
import { toDisc } from "../domain/model/turn/disc";
import { GameRepository } from "../domain/model/game/gameRepository";
import { Point } from "../domain/model/turn/point";
import { TurnRepository } from "../domain/model/turn/turnRepository";
import { ApplicationError } from "./error/applicationError";

const gameGateway = new GameGateway();

const turnRepository = new TurnRepository();
const gameRepository = new GameRepository();

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
      const game = await gameRepository.findLatest(connection);

      if (!game) {
        throw new ApplicationError(
          "LatestGameNotFound",
          "Latest game not found"
        );
      }
      if (!game.id) {
        throw new Error("game.id not exist");
      }

      const turn = await turnRepository.findForGameIdAndTurnCount(
        connection,
        game.id,
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
        throw new ApplicationError(
          "LatestGameNotFound",
          "Latest game not found"
        );
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
