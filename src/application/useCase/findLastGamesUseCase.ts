import { connectMySQL } from "../../infrastructure/connection";
import {
  FindLastGamesQueryModel,
  FindLastGamesQueryService,
} from "../query/findLastGamesQueryService";
("../../infrastructure/connection");

const FIND_COUNT = 10;

export class FindLastGamesUseCase {
  constructor(private _queryService: FindLastGamesQueryService) {}

  async run(): Promise<FindLastGamesQueryModel[]> {
    const connection = await connectMySQL();

    try {
      return await this._queryService.query(connection, FIND_COUNT);
    } finally {
      connection.end();
    }
  }
}
