import { IGamer, GamerId } from "../interfaces/IGamer";


export interface IDb {
  start(g: IGamer): Promise<void>;
  getScore(id: GamerId): Promise<number>;
}