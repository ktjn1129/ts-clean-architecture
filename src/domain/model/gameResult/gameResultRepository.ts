import mysql from "mysql2/promise";
import { GameResult } from "./gameResult";
import { GameResultGateway } from "./gameResultGamteway";
import { toWinnerDisc } from "./winnerDisc";

const gameResultGateway = new GameResultGateway();

export class GameResultRepository {
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
