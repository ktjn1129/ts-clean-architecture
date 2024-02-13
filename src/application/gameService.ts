import { Game } from "../domain/model/game/game";
import { firstTurn } from "../domain/model/turn/turn";
import { connectMySQL } from "../infrastructure/connection";
import { GameMySQLRepository } from "../infrastructure/repository/game/gameMySQLRepository";
import { TurnMySQLRepository } from "../infrastructure/repository/turn/turnMySQLRepository";

const gameRepository = new GameMySQLRepository();
const turnRepository = new TurnMySQLRepository();

export class GameService {
  async startNewGame() {
    const now = new Date();
    const connection = await connectMySQL();

    try {
      await connection.beginTransaction();

      const game = await gameRepository.save(
        connection,
        new Game(undefined, now)
      );
      if (!game.id) {
        throw new Error("game.id not exist");
      }
      const turn = firstTurn(game.id, now);

      await turnRepository.save(connection, turn);

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
