import { GameRepository } from "../../domain/model/game/gameRepository";
import { GameResult } from "../../domain/model/gameResult/gameResult";
import { GameResultRepository } from "../../domain/model/gameResult/gameResultRepository";
import { TurnRepository } from "../../domain/model/turn/turnRepository";
import { connectMySQL } from "../../infrastructure/connection";
import { ApplicationError } from "../error/applicationError";

class FindLatestGameTurnByTurnCountOutput {
  constructor(
    private _turnCount: number,
    private _board: number[][],
    private _nextDisc: number | undefined,
    private _winnerDisc: number | undefined
  ) {}

  get turnCount() {
    return this._turnCount;
  }

  get board() {
    return this._board;
  }

  get nextDisc() {
    return this._nextDisc;
  }

  get winnerDisc() {
    return this._winnerDisc;
  }
}

export class FindLatestGameTurnByTurnCountUseCase {
  constructor(
    private _turnRepository: TurnRepository,
    private _gameRepository: GameRepository,
    private _gameResultRepository: GameResultRepository
  ) {}

  async run(turnCount: number): Promise<FindLatestGameTurnByTurnCountOutput> {
    const connection = await connectMySQL();

    try {
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

      const turn = await this._turnRepository.findForGameIdAndTurnCount(
        connection,
        game.id,
        turnCount
      );

      let gameResult: GameResult | undefined;
      if (turn.gameEnded()) {
        gameResult = await this._gameResultRepository.findForGameId(
          connection,
          game.id
        );
      }

      return new FindLatestGameTurnByTurnCountOutput(
        turnCount,
        turn.board.discs,
        turn.nextDisc,
        gameResult?.winnerDisc
      );
    } finally {
      await connection.end();
    }
  }
}
