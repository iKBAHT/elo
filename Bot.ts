import TelegramBot = require('node-telegram-bot-api');
import { IDb } from "./db/IDb";
import { IGamer } from "./interfaces/IGamer";
import { ITgMessage } from "./interfaces/ITgMessage";
import { defaultScore } from "./rating/settings";
import { createUsername, getUsernameFromText } from "./rating/utils";


export class Bot {
  constructor(
    protected botApi: TelegramBot,
    protected db: IDb
  ) { }

  init(): void {
    this.botApi.onText(/^\/start$/, this.start);
    this.botApi.onText(/^\/score$/, this.getScore);
    this.botApi.onText(/^\/scores$/, this.getAllScores);
    this.botApi.onText(/^\/iwon/, this.win);
  }

  protected start = (msg: ITgMessage): void => {
    const gamer: IGamer = {
      groupId: msg.chat.id,
      userId: msg.from.id,
      username: createUsername(msg),
      score: defaultScore
    }
    this.db.start(gamer)
      .then(() => {
        this.botApi.sendMessage(msg.chat.id, 'Wellcome ' + gamer.username);
      })
      .catch((err: any) => {
        this.sendError(msg, err);
      });
  }

  protected getScore = (msg: ITgMessage): void => {
    this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id })
      .then(gamer => {
        this.botApi.sendMessage(msg.chat.id, gamer.username + ' score ' + gamer.score);
      })
      .catch((err: any) => {
        this.sendError(msg, err);
      });
  }

  protected getAllScores = (msg: ITgMessage): void => {
    this.db.getGroupGamers(msg.chat.id)
      .then(gamers => {
        let text = 'scores:\n';
        for (let i = 0; i < gamers.length; ++i) {
          const gamer = gamers[i];
          text += `${gamer.username} - ${gamer.score}`;
          if (i !== gamers.length - 1) {
            text += '\n';
          }
        }
        this.botApi.sendMessage(msg.chat.id, text);
      })
      .catch((err: any) => {
        this.sendError(msg, err);
      });
  }

  protected win = (msg: ITgMessage): void => {
    // 1 получение 2ух игроков
    //  1.1 найти игрока по имени
    // 2 подсчет нового рейтинга
    // 3 запись результата
    // 4 вывод новых значений

    try {
      var loserUsername = getUsernameFromText(msg.text);
    } catch(err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const looserPr = this.db.getGamerByUsername(msg.chat.id, loserUsername);
    const winnerPr = this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id });
    Promise.all([looserPr])
      .then(gamers => {
        const winner = gamers[0];
        const looser = gamers[1];
        this.botApi.sendMessage(msg.chat.id, 'OK');
      })
      .catch((err: any) => {
        this.sendError(msg, err);
      });
  }

  protected sendError(msg: ITgMessage, error: any): void {
    const text: string = typeof error === 'string' ? error : JSON.stringify(error);
    this.botApi.sendMessage(msg.chat.id, 'Some error - ' + text);
  }
}
