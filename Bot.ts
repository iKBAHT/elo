import TelegramBot = require('node-telegram-bot-api');
import { IDb } from "./db/IDb";
import { IGamer, GamerId } from "./interfaces/IGamer";
import { ITgMessage } from "./interfaces/ITgMessage";
import { defaultScore } from "./rating/settings";


export class Bot {
  constructor(
    protected botApi: TelegramBot,
    protected db: IDb
  ) { }

  init(): void {
    this.botApi.onText(/\/start/, this.start);
    this.botApi.onText(/\/score/, this.getScore);
  }

  protected start = (msg: ITgMessage): void => {
    const gamer: IGamer = {
      id: this.getGamerId(msg),
      userId: msg.from.id,
      username: msg.from.username,
      score: defaultScore
    }
    this.db.start(gamer)
      .then(() => {
        this.botApi.sendMessage(msg.chat.id, 'Wellcome ' + gamer.username);
      })
      .catch((err: any) => {
        this.botApi.sendMessage(msg.chat.id, 'Some error - ' + JSON.stringify(err));
      });
  }

  protected getScore = (msg: ITgMessage): void => {
    this.db.getScore(this.getGamerId(msg))
      .then(score => {
        this.botApi.sendMessage(msg.chat.id, msg.from.username + ' score ' + score);
      })
      .catch((err: any) => {
        this.botApi.sendMessage(msg.chat.id, 'Some error - ' + JSON.stringify(err));
      });
  }

  protected getGamerId(msg: ITgMessage): GamerId {
    return msg.from.id + '' + msg.chat.id;
  }
}
