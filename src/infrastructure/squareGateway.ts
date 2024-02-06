import mysql from "mysql2/promise";
import { SquareRecord } from "./squareRecord";

export class SquareGateway {
  async findForTurnId(
    connection: mysql.Connection,
    turnId: number
  ): Promise<SquareRecord[]> {
    const squaresSelectResult = await connection.execute<mysql.RowDataPacket[]>(
      "select id, turn_id, x, y, disc from squares where turn_id = ?",
      [turnId]
    );
    const records = squaresSelectResult[0];

    return records.map((result) => {
      return new SquareRecord(
        result["id"],
        result["turn_id"],
        result["x"],
        result["y"],
        result["disc"]
      );
    });
  }

  async insertAll(
    connection: mysql.Connection,
    turnId: number,
    board: number[][]
  ) {
    //マス目の数を計算
    const squareCount = board
      .map((line) => line.length)
      .reduce((v1, v2) => v1 + v2, 0);
    const squareInsertSql =
      "insert into squares (turn_id, x, y, disc) values" +
      Array.from(Array(squareCount))
        .map(() => "(?, ?, ?, ?)")
        .join(", ");

    const squaresInsertValues: any[] = [];
    board.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId);
        squaresInsertValues.push(x);
        squaresInsertValues.push(y);
        squaresInsertValues.push(disc);
      });
    });

    await connection.execute(squareInsertSql, squaresInsertValues);
  }
}
