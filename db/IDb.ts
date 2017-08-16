import { IGamer, IGamerId } from "../interfaces/IGamer";


export interface IDb {
  start(g: IGamer): Promise<void>;
  getScore(id: IGamerId): Promise<number>;
  getAllScores(groupId: number): Promise<Array<IGamer>>;
}
