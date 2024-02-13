import mysql from "mysql2/promise";
import { MoveRecord } from "./moveRecord";

export class MoveGateway {
  async findForTurnId(
    connection: mysql.Connection,
    turnId: number
  ): Promise<MoveRecord | undefined> {
    const moveSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, turn_id, disc, x, y from moves where turn_id = ?",
      [turnId]
    );
    const record = moveSelectResult[0][0];

    if (!record) {
      return undefined;
    }

    return new MoveRecord(
      record["id"],
      record["turn_id"],
      record["disc"],
      record["x"],
      record["y"]
    );
  }

  async insert(
    connection: mysql.Connection,
    turnId: number,
    disc: number,
    x: number,
    y: number
  ) {
    await connection.execute(
      "insert into moves (turn_id, disc, x, y) values (?, ?, ?, ?)",
      [turnId, disc, x, y]
    );
  }
}
