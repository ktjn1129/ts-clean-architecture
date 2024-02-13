import mysql from "mysql2/promise";
import { GameResult } from "../../../domain/model/gameResult/gameResult";
import { GameResultRepository } from "../../../domain/model/gameResult/gameResultRepository";
import { toWinnerDisc } from "../../../domain/model/gameResult/winnerDisc";
import { GameResultGateway } from "./gameResultGateway";

const gameResultGateway = new GameResultGateway();

export class GameResultMySQLRepository implements GameResultRepository {
  async findForGameId(
    connection: mysql.Connection,
    gameId: number
  ): Promise<GameResult | undefined> {
    const gameResultRecord = await gameResultGateway.findForGameId(
      connection,
      gameId
    );

    if (!gameResultRecord) {
      return undefined;
    }

    return new GameResult(
      gameResultRecord.gameId,
      toWinnerDisc(gameResultRecord.winnerDisc),
      gameResultRecord.endAt
    );
  }

  async save(connection: mysql.Connection, gameResult: GameResult) {
    await gameResultGateway.insert(
      connection,
      gameResult.gameId,
      gameResult.winnerDisc,
      gameResult.endAt
    );
  }
}
