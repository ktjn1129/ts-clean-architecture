import { connectMySQL } from "../infrastructure/connection";
import { Game } from "../domain/model/game/game";
import { GameRepository } from "../domain/model/game/gameRepository";
import { firstTurn } from "../domain/model/turn/turn";
import { TurnRepository } from "../domain/model/turn/turnRepository";

const gameRepository = new GameRepository();
const turnRepository = new TurnRepository();

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
