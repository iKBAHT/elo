import { IGamer } from "../interfaces/IGamer";


export interface IDb {
  start(g: IGamer): Promise<void>;
}