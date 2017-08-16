import { IGamer, IGamerId } from "../interfaces/IGamer";


export interface IDb {
  create(g: IGamer): Promise<void>;
  updateScore(id: IGamerId, score: number): Promise<void>;
  getGamer(id: IGamerId): Promise<IGamer>;
  getGamerByUsername(groupId: number, username: string): Promise<IGamer>;
  getGroupGamers(groupId: number): Promise<Array<IGamer>>;
}
