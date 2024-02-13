import mysql from "mysql2/promise";
import { Game } from "../../../domain/model/game/game";
import { GameGateway } from "./gameGateway";
import { GameRepository } from "../../../domain/model/game/gameRepository";

const gameGateway = new GameGateway();

export class GameMySQLRepository implements GameRepository {
  async findLatest(connection: mysql.Connection): Promise<Game | undefined> {
    const gameRecord = await gameGateway.findLatest(connection);

    if (!gameRecord) {
      return undefined;
    }

    return new Game(gameRecord.id, gameRecord.startedAt);
  }

  async save(connection: mysql.Connection, game: Game): Promise<Game> {
    const gameRecord = await gameGateway.insert(connection, game.startedAt);

    return new Game(gameRecord.id, gameRecord.startedAt);
  }
}
