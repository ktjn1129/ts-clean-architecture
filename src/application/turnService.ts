import { GameResult } from "../domain/model/gameResult/gameResult";
import { Disc } from "../domain/model/turn/disc";
import { Point } from "../domain/model/turn/point";
import { connectMySQL } from "../infrastructure/connection";
import { GameMySQLRepository } from "../infrastructure/repository/game/gameMySQLRepository";
import { GameResultMySQLRepository } from "../infrastructure/repository/gameResult/gameResultMySQLRepository";
import { TurnMySQLRepository } from "../infrastructure/repository/turn/turnMySQLRepository";
import { ApplicationError } from "./error/applicationError";

const turnRepository = new TurnMySQLRepository();
const gameRepository = new GameMySQLRepository();
const gameResultRepository = new GameResultMySQLRepository();

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

      let gameResult: GameResult | undefined;
      if (turn.gameEnded()) {
        gameResult = await gameResultRepository.findForGameId(
          connection,
          game.id
        );
      }

      return new FindLatestGameTurnByTurnCountOutput(
        turnCount,
        turn.board.discs,
        turn.nextDisc,
        gameResult?.winnerDisc
      );
    } finally {
      await connection.end();
    }
  }

  async registerTurn(turnCount: number, disc: Disc, point: Point) {
    const connection = await connectMySQL();

    try {
      await connection.beginTransaction();
      //一つ前のターンを取得
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

      const previousTurnCount = turnCount - 1;

      const previousTurn = await turnRepository.findForGameIdAndTurnCount(
        connection,
        game.id,
        previousTurnCount
      );

      //石を置く
      const newTurn = previousTurn.placeNext(disc, point);

      //ターンを保存する
      await turnRepository.save(connection, newTurn);

      //勝敗が決した場合、対戦結果を保存
      if (newTurn.gameEnded()) {
        const winnerDisc = newTurn.winnerDisc();
        const gameResult = new GameResult(game.id, winnerDisc, newTurn.endAt);
        await gameResultRepository.save(connection, gameResult);
      }

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
