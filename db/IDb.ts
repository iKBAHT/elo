import { IGamer, IGamerId } from "../interfaces/IGamer";


export interface IDb {
  start(g: IGamer): Promise<void>;
  getGamer(id: IGamerId): Promise<IGamer>;
  getGamerByUsername(groupId: number, username: string): Promise<IGamer>;
  getGroupGamers(groupId: number): Promise<Array<IGamer>>;
}
