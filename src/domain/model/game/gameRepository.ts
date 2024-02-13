import mysql from "mysql2/promise";
import { Game } from "./game";

export interface GameRepository {
  findLatest(connection: mysql.Connection): Promise<Game | undefined>;

  save(connection: mysql.Connection, game: Game): Promise<Game>;
}
