import mysql from "mysql2/promise";
import { Turn } from "./turn";

export interface TurnRepository {
  findForGameIdAndTurnCount(
    connection: mysql.Connection,
    gameId: number,
    turnCount: number
  ): Promise<Turn>;

  save(connection: mysql.Connection, turn: Turn): Promise<void>;
}
