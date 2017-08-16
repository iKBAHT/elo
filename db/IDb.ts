import { IGamer, GamerId, IGamerId } from "../interfaces/IGamer";


export interface IDb {
  start(g: IGamer): Promise<void>;
  getScore(id: IGamerId): Promise<number>;
}