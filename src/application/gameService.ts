import { Game } from "../domain/model/game/game";
import { GameRepository } from "../domain/model/game/gameRepository";
import { firstTurn } from "../domain/model/turn/turn";
import { TurnRepository } from "../domain/model/turn/turnRepository";
import { connectMySQL } from "../infrastructure/connection";

export class GameService {
  constructor(
    private _gameRepository: GameRepository,
    private _turnRepository: TurnRepository
  ) {}

  async startNewGame() {
    const now = new Date();
    const connection = await connectMySQL();

    try {
      await connection.beginTransaction();

      const game = await this._gameRepository.save(
        connection,
        new Game(undefined, now)
      );
      if (!game.id) {
        throw new Error("game.id not exist");
      }
      const turn = firstTurn(game.id, now);

      await this._turnRepository.save(connection, turn);

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
