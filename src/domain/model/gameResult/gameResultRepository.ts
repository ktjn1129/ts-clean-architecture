import mysql from "mysql2/promise";
import { GameResult } from "./gameResult";

export interface GameResultRepository {
  findForGameId(
    connection: mysql.Connection,
    gameId: number
  ): Promise<GameResult | undefined>;

  save(connection: mysql.Connection, gameResult: GameResult): Promise<void>;
}
