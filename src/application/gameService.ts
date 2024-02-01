import { GameGateway } from "../dataaccess/gameGateway";
import { TurnGateway } from "../dataaccess/turnGateway";
import { SquareGateway } from "../dataaccess/squareGateway";
import { DARK, INITIAL_BOARD } from "../application/constants";
import { connectMySQL } from "../dataaccess/connection";

const gameGateway = new GameGateway();
const turnGateway = new TurnGateway();
const squareGateway = new SquareGateway();

export class GameService {
  async startNewGame() {
    const now = new Date();
    const connection = await connectMySQL();

    try {
      await connection.beginTransaction();

      const gameRecord = await gameGateway.insert(connection, now);
      const turnRecord = await turnGateway.insert(
        connection,
        gameRecord.id,
        0,
        DARK,
        now
      );
      await squareGateway.insertAll(connection, turnRecord.id, INITIAL_BOARD);

      await connection.commit();
    } finally {
      await connection.end();
    }
  }
}
