import { IGamer, IGamerId } from '../interfaces/IGamer';

export interface IDb {
  create(g: IGamer): Promise<void>;
  updateGamer(id: IGamer): Promise<void>;
  getGamer(id: IGamerId): Promise<IGamer>;
  getGamerByUsername(groupId: number, username: string): Promise<IGamer>;
  deleteGamer(groupId: number, username: string): Promise<IGamer>;
  getGroupGamers(groupId: number): Promise<Array<IGamer>>;
  getTopGroupGamer(groupId: number): Promise<IGamer>;
}
