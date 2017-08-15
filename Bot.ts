import TelegramBot = require('node-telegram-bot-api');
import { IDb } from "./db/IDb";
import { IGamer } from "./interfaces/IGamer";
import { ITgMessage } from "./interfaces/ITgMessage";
import { defaultScore } from "./rating/settings";


export class Bot {
  constructor(
    protected botApi: TelegramBot,
    protected db: IDb
  ) { }

  init(): void {
    this.botApi.onText(/\/start/, this.start);
  }

  protected start = (msg: ITgMessage): void => {
    const gamer: IGamer = {
      id: msg.from.id + '' + msg.chat.id,
      userId: msg.from.id,
      username: msg.from.username,
      score: defaultScore
    }
    this.db.start(gamer)
      .then(() => {
        this.botApi.sendMessage(msg.chat.id, 'Wellcome ' + gamer.username);
      })
      .catch((err: any) => {
        this.botApi.sendMessage(msg.chat.id, 'Some error ((( ' + JSON.stringify(err));
      });
  }
}
