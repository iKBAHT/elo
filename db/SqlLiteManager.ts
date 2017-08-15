import { IDb } from "./IDb";
import { IGamer } from "../interfaces/IGamer";


export class SqlLiteManager implements IDb {
  start(_gamer: IGamer): Promise<void> {
    return Promise.resolve();
  }
}