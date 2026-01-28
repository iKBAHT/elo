import TelegramBot from 'node-telegram-bot-api';
import { IDb } from './db/IDb';
import { IGamer } from './interfaces/IGamer';
import { ITgMessage } from './interfaces/ITgMessage';
import { defaultScore } from './rating/settings';
import {
  createUsername,
  getPercentFormatting,
  getUsernameFromText
} from './rating/utils';
const EloRank = require('elo-rank');

const TEXT_PARSE_MODE = { parse_mode: 'HTML' };
const defaultKFactor = 32;

export class Bot {
  protected eloRank = new EloRank(defaultKFactor);

  constructor(
    protected botApi: TelegramBot,
    protected db: IDb
  ) {}

  init(): void {
    this.botApi.onText(/^\/join$/i, this.join);
    this.botApi.onText(/^\/scores$/i, this.getAllScores);
    this.botApi.onText(/^\/stats$/i, this.getAllStats);
    this.botApi.onText(/^\/iwon /i, this.win);
    this.botApi.onText(/^\/iwonWithMars/i, this.winMars);
    this.botApi.onText(/^\/ilost /i, this.lose);
    this.botApi.onText(/^\/ilostWithMars/i, this.loseMars);
    this.botApi.onText(/^\/help$/i, this.help);
  }

  protected join = (msg: ITgMessage): void => {
    const gamer: IGamer = {
      groupId: msg.chat.id,
      userId: msg.from.id,
      username: createUsername(msg),
      score: defaultScore,
      gamesCount: 0,
      winsCount: 0,
      marsWinsCount: 0,
      marsLoseCount: 0,
      bestScore: defaultScore
    };
    this.db.getGamerByUsername(gamer.groupId, gamer.username).then(
      () => {
        this.sendError(msg.chat.id, 'user already exist');
      },
      () => {
        this.db
          .create(gamer)
          .then(() => {
            this.botApi.sendMessage(msg.chat.id, 'Welcome ' + gamer.username);
          })
          .catch((err: any) => {
            this.sendError(msg.chat.id, err);
          });
      }
    );
  };

  protected getAllScores = (msg: ITgMessage): void => {
    this.getScores(msg.chat.id)
      .then((text) => {
        text = 'scores:\n' + text;
        this.botApi.sendMessage(msg.chat.id, text);
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  };

  protected getAllStats = (msg: ITgMessage): void => {
    this.getStats(msg.chat.id)
      .then((text) => {
        text = 'statistics:\n' + text;
        this.botApi.sendMessage(msg.chat.id, text);
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  };

  protected win = (msg: ITgMessage): void => {
    try {
      var loserUsername = getUsernameFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const looserPr = this.db.getGamerByUsername(msg.chat.id, loserUsername);
    const winnerPr = this.db.getGamer({
      userId: msg.from.id,
      groupId: msg.chat.id
    });
    this.changeGamersInfo(winnerPr, looserPr, msg);
  };

  protected winMars = (msg: ITgMessage): void => {
    try {
      var loserUsername = getUsernameFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const looserPr = this.db.getGamerByUsername(msg.chat.id, loserUsername);
    const winnerPr = this.db.getGamer({
      userId: msg.from.id,
      groupId: msg.chat.id
    });
    this.changeGamersInfo(winnerPr, looserPr, msg, true);
  };

  protected lose = (msg: ITgMessage): void => {
    try {
      var winnerUsername = getUsernameFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const winnerPr = this.db.getGamerByUsername(msg.chat.id, winnerUsername);
    const looserPr = this.db.getGamer({
      userId: msg.from.id,
      groupId: msg.chat.id
    });
    this.changeGamersInfo(winnerPr, looserPr, msg);
  };

  protected loseMars = (msg: ITgMessage): void => {
    try {
      var winnerUsername = getUsernameFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const winnerPr = this.db.getGamerByUsername(msg.chat.id, winnerUsername);
    const looserPr = this.db.getGamer({
      userId: msg.from.id,
      groupId: msg.chat.id
    });
    this.changeGamersInfo(winnerPr, looserPr, msg, true);
  };

  protected help = (msg: ITgMessage): void => {
    let text = '';
    text += '<b>/join</b> - join to the raiting\n';
    text += '<b>/scores</b> - get total scores\n';
    text += '<b>/stats</b> - get statistics\n';
    text += '<b>/iwon</b> username - your victory over username\n';
    text +=
      '<b>/iwonWithMars</b> username - your victory with mars over username\n';
    text += '<b>/ilost</b> username - your defeat from username\n';
    text +=
      '<b>/ilostWithMars</b> username - your defeat with mars from username\n';
    this.botApi.sendMessage(msg.chat.id, text, TEXT_PARSE_MODE as any);
  };

  protected changeGamersInfo(
    winnerPr: Promise<IGamer>,
    looserPr: Promise<IGamer>,
    msg: ITgMessage,
    isMars = false
  ): void {
    const championPr = this.db.getTopGroupGamer(msg.chat.id);
    Promise.all([winnerPr, looserPr, championPr])
      .then((gamers) => {
        const winner = gamers[0];
        const looser = gamers[1];
        const champion = gamers[2];

        if (isMars) {
          this.eloRank.setKFactor(defaultKFactor * 2);
        }
        return this.updateScores(winner, looser, isMars).then((info) => {
          const deltaScore = info.winnerScore - winner.score;
          let text = `new scores (diff ${deltaScore}):\n`;
          text += `${winner.username} - ${info.winnerScore}\n`;
          text += `${looser.username} - ${info.looserScore}`;
          this.botApi.sendMessage(msg.chat.id, text);

          return this.db.getTopGroupGamer(msg.chat.id).then((newChampion) => {
            if (newChampion.userId !== champion.userId) {
              let newChampionText =
                'We have the new leader - ' + newChampion.username;
              this.botApi.sendMessage(msg.chat.id, newChampionText);
            }
          });
        });
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      })
      .then(() => {
        this.eloRank.setKFactor(defaultKFactor);
      });
  }

  private updateScores(
    winner: IGamer,
    looser: IGamer,
    isMars: boolean
  ): Promise<UpdateScoresResult> {
    const expectedWinnerScore = this.eloRank.getExpected(
      winner.score,
      looser.score
    );
    const expectedLoserScore = this.eloRank.getExpected(
      looser.score,
      winner.score
    );

    const newWinnerScore = this.eloRank.updateRating(
      expectedWinnerScore,
      1,
      winner.score
    ) as number;

    const newLoserScore = this.eloRank.updateRating(
      expectedLoserScore,
      0,
      looser.score
    ) as number;

    // update winner info
    const updatedWinner = Object.assign({}, winner);
    updatedWinner.bestScore = Math.max(newWinnerScore, winner.bestScore);
    updatedWinner.score = newWinnerScore;
    updatedWinner.gamesCount++;
    updatedWinner.winsCount++;
    if (isMars) {
      updatedWinner.marsWinsCount++;
    }

    // update looser info
    const updatedLooser = Object.assign({}, looser);
    updatedLooser.bestScore = Math.max(newLoserScore, looser.bestScore);
    updatedLooser.score = newLoserScore;
    updatedLooser.gamesCount++;
    if (isMars) {
      updatedLooser.marsLoseCount++;
    }

    const winnerUpdatePr = this.db.updateGamer(updatedWinner);
    const loserUpdatePr = this.db.updateGamer(updatedLooser);

    return Promise.all([winnerUpdatePr, loserUpdatePr]).then(() => {
      return {
        winnerScore: newWinnerScore,
        looserScore: newLoserScore
      };
    });
  }

  private sendError(chatId: number, error: any): void {
    const text: string =
      typeof error === 'string' ? error : JSON.stringify(error);
    this.botApi.sendMessage(chatId, 'Some error - ' + text);
  }

  private getScores = (chatId: number): Promise<string> => {
    return this.db
      .getGroupGamers(chatId)
      .then((gamers) => {
        let text = '';
        for (let i = 0; i < gamers.length; ++i) {
          const gamer = gamers[i];
          const line = `${i + 1}. ${gamer.username} - ${gamer.score}`;
          text += line;
          if (i !== gamers.length - 1) {
            text += '\n';
          }
        }
        return text;
      })
      .catch((err: any) => {
        this.sendError(chatId, err);
        return '';
      });
  };

  private getStats = (chatId: number): Promise<string> => {
    return this.db
      .getGroupGamers(chatId)
      .then((gamers) => {
        let text = '';
        for (let i = 0; i < gamers.length; ++i) {
          const g = gamers[i];
          let line = `${i + 1}. ${g.username} - [score ${g.score}]`;

          if (g.gamesCount === 0) {
            line += ' not enough data';
          } else {
            const winRate = getPercentFormatting(g.winsCount / g.gamesCount);
            const marsWinRate = getPercentFormatting(
              g.marsWinsCount / g.gamesCount
            );
            const marsLossRate = getPercentFormatting(
              g.marsLoseCount / g.gamesCount
            );
            line += ` [best score ${g.bestScore}] [win rate ${winRate}] [win rate by mars ${marsWinRate}] [loss rate by mars ${marsLossRate}] [games ${g.gamesCount}]`;
          }

          text += line;
          if (i !== gamers.length - 1) {
            text += '\n\n';
          }
        }
        return text;
      })
      .catch((err: any) => {
        this.sendError(chatId, err);
        return '';
      });
  };
}

interface UpdateScoresResult {
  winnerScore: number;
  looserScore: number;
}
