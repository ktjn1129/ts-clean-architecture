import { GameRepository } from "../../domain/model/game/gameRepository";
import { GameResult } from "../../domain/model/gameResult/gameResult";
import { GameResultRepository } from "../../domain/model/gameResult/gameResultRepository";
import { Disc } from "../../domain/model/turn/disc";
import { Point } from "../../domain/model/turn/point";
import { TurnRepository } from "../../domain/model/turn/turnRepository";
import { connectMySQL } from "../../infrastructure/connection";
import { ApplicationError } from "../error/applicationError";

export class RegisterTurnUseCase {
  constructor(
    private _turnRepository: TurnRepository,
    private _gameRepository: GameRepository,
    private _gameResultRepository: GameResultRepository
  ) {}

  async run(turnCount: number, disc: Disc, point: Point) {
    const connection = await connectMySQL();

    try {
      await connection.beginTransaction();
      //一つ前のターンを取得
      const game = await this._gameRepository.findLatest(connection);

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

      const previousTurn = await this._turnRepository.findForGameIdAndTurnCount(
        connection,
        game.id,
        previousTurnCount
      );

      //石を置く
      const newTurn = previousTurn.placeNext(disc, point);

      //ターンを保存する
      await this._turnRepository.save(connection, newTurn);

      //勝敗が決した場合、対戦結果を保存
      if (newTurn.gameEnded()) {
        const winnerDisc = newTurn.winnerDisc();
        const gameResult = new GameResult(game.id, winnerDisc, newTurn.endAt);
        await this._gameResultRepository.save(connection, gameResult);
      }

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
