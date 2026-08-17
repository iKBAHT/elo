import { IChat } from '../interfaces/IChat';
import { IUser } from '../interfaces/IUser';
import { IGamer, IGamerId, GamerWithStats } from '../interfaces/IGamer';
import { IGame } from '../interfaces/IGame';

export interface IDb {
  upsertChat(chat: IChat): Promise<void>;
  getChat(id: number): Promise<IChat>;

  upsertUser(user: IUser): Promise<void>;
  getUser(id: number): Promise<IUser>;
  getUserByUsername(username: string, chatId: number): Promise<IUser>;

  createGamer(g: IGamer): Promise<void>;
  getGamer(id: IGamerId): Promise<IGamer & { username: string }>;
  getGamerByUsername(username: string, chatId: number): Promise<IGamer & { username: string }>;
  updateGamer(g: IGamer): Promise<void>;
  getGroupGamers(chatId: number): Promise<Array<GamerWithStats>>;
  getTopGroupGamer(chatId: number): Promise<IGamer & { username: string }>;

  createGame(game: IGame): Promise<number>;
  updateGameAnnouncement(gameId: number, announcementId: number): Promise<void>;
  getLatestGameByDeclarer(chatId: number, userId: number): Promise<IGame | null>;
  getLatestDeletedGameByDeclarer(chatId: number, userId: number): Promise<IGame | null>;
  softDeleteGame(gameId: number): Promise<void>;
  undeleteGame(gameId: number): Promise<void>;
  getGamesByChat(chatId: number): Promise<Array<IGame>>;
}
