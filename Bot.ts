import TelegramBot from 'node-telegram-bot-api';
import { IDb } from './db/IDb';
import { IGamer } from './interfaces/IGamer';
import { ITgMessage } from './interfaces/ITgMessage';
import { defaultScore } from './rating/settings';
import {
  createUsername,
  getUsernameFromText,
  get3UsernamesFromText
} from './rating/utils';
const EloRank = require('elo-rank');

const TEXT_PARSE_MODE = { parse_mode: 'HTML' };
const defaultKFactor = 32;

export class Bot {
  protected eloRank = new EloRank(defaultKFactor);

  constructor(protected botApi: TelegramBot, protected db: IDb) {}

  init(): void {
    this.botApi.onText(/^\/join$/i, this.join);
    this.botApi.onText(/^\/scores$/i, this.getAllScores);
    this.botApi.onText(/^\/iwon/i, this.win);
    this.botApi.onText(/^\/iwonWithMars/i, this.winMars);
    this.botApi.onText(/^\/ilost/i, this.lose);
    this.botApi.onText(/^\/ilostWithMars/i, this.loseMars);
    this.botApi.onText(/^\/help$/i, this.help);

    // this.botApi.onText(/^\/wewon/i, this.weWin);
    // this.botApi.onText(/^\/welost/i, this.weLose);
    // this.botApi.onText(/^\/score$/i, this.getScore);
  }

  protected join = (msg: ITgMessage): void => {
    const gamer: IGamer = {
      groupId: msg.chat.id,
      userId: msg.from.id,
      username: createUsername(msg),
      score: defaultScore
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

  protected getScore = (msg: ITgMessage): void => {
    this.db
      .getGamer({
        userId: msg.from.id,
        groupId: msg.chat.id
      })
      .then((gamer) => {
        this.botApi.sendMessage(
          msg.chat.id,
          `${gamer.username}  score  ${gamer.score}`
        );
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
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
    this.changeScores(winnerPr, looserPr, msg);
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
    this.changeScores(winnerPr, looserPr, msg, true);
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
    this.changeScores(winnerPr, looserPr, msg);
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
    this.changeScores(winnerPr, looserPr, msg, true);
  };

  protected help = (msg: ITgMessage): void => {
    let text = '';
    text += '<b>/join</b> - join to the raiting\n';
    text += '<b>/scores</b> - get total scores\n';
    text += '<b>/iwon</b> username - your victory over username\n';
    text +=
      '<b>/iwonWithMars</b> username - your victory with mars over username\n';
    text += '<b>/ilost</b> username - your defeat from username\n';
    text +=
      '<b>/ilostWithMars</b> username - your defeat with mars from username\n';
    this.botApi.sendMessage(msg.chat.id, text, TEXT_PARSE_MODE as any);
  };

  protected changeScores(
    winnerPr: Promise<IGamer>,
    looserPr: Promise<IGamer>,
    msg: ITgMessage,
    needToDouble = false
  ): void {
    const championPr = this.db.getTopGroupGamer(msg.chat.id);
    Promise.all([winnerPr, looserPr, championPr])
      .then((gamers) => {
        const winner = gamers[0];
        const looser = gamers[1];
        const champion = gamers[2];

        if (needToDouble) {
          this.eloRank.setKFactor(defaultKFactor * 2);
        }
        return this.updateScores(winner, looser).then((info) => {
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

  protected weWin = (msg: ITgMessage): void => {
    try {
      var usernames = get3UsernamesFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const winner1Pr = this.db.getGamer({
      userId: msg.from.id,
      groupId: msg.chat.id
    });
    const winner2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[0]);
    const looser1Pr = this.db.getGamerByUsername(msg.chat.id, usernames[1]);
    const looser2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[2]);
    this.changeScores2x2(winner1Pr, winner2Pr, looser1Pr, looser2Pr, msg);
  };

  protected weLose = (msg: ITgMessage): void => {
    try {
      var usernames = get3UsernamesFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const looser1Pr = this.db.getGamer({
      userId: msg.from.id,
      groupId: msg.chat.id
    });
    const looser2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[0]);
    const winner1Pr = this.db.getGamerByUsername(msg.chat.id, usernames[1]);
    const winner2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[2]);
    this.changeScores2x2(winner1Pr, winner2Pr, looser1Pr, looser2Pr, msg);
  };

  protected changeScores2x2(
    winner1Pr: Promise<IGamer>,
    winner2Pr: Promise<IGamer>,
    looser1Pr: Promise<IGamer>,
    looser2Pr: Promise<IGamer>,
    msg: ITgMessage
  ): void {
    const championPr = this.db.getTopGroupGamer(msg.chat.id);
    Promise.all([winner1Pr, winner2Pr, looser1Pr, looser2Pr, championPr])
      .then((gamers) => {
        const winner1 = gamers[0];
        const winner2 = gamers[1];
        const looser1 = gamers[2];
        const looser2 = gamers[3];
        const champion = gamers[4];

        const winnerTeamAverage = Math.floor(
          (winner1.score + winner2.score) / 2
        );
        const loserTeamAverage = Math.floor(
          (looser1.score + looser2.score) / 2
        );
        const expectedWinnerDiffRatio = this.eloRank.getExpected(
          winnerTeamAverage,
          loserTeamAverage
        );
        const expectedLooserDiffRatio = this.eloRank.getExpected(
          loserTeamAverage,
          winnerTeamAverage
        );

        const winner1NewScore = this.eloRank.updateRating(
          expectedWinnerDiffRatio,
          1,
          winner1.score
        );
        const winner2NewScore = this.eloRank.updateRating(
          expectedWinnerDiffRatio,
          1,
          winner2.score
        );
        const looser1NewScore = Math.max(
          0,
          this.eloRank.updateRating(expectedLooserDiffRatio, 0, looser1.score)
        );
        const looser2NewScore = Math.max(
          0,
          this.eloRank.updateRating(expectedLooserDiffRatio, 0, looser2.score)
        );

        const winner1UpdatePr = this.db.updateScore(winner1, winner1NewScore);
        const winner2UpdatePr = this.db.updateScore(winner2, winner2NewScore);
        const looser1UpdatePr = this.db.updateScore(looser1, looser1NewScore);
        const looser2UpdatePr = this.db.updateScore(looser2, looser2NewScore);

        return Promise.all([
          winner1UpdatePr,
          winner2UpdatePr,
          looser1UpdatePr,
          looser2UpdatePr
        ]).then(() => {
          const playedGamers: Array<PlayedGamer> = [
            {
              id: winner1.userId,
              delta: winner1NewScore - winner1.score
            },
            {
              id: winner2.userId,
              delta: winner2NewScore - winner2.score
            },
            {
              id: looser1.userId,
              delta: looser1NewScore - looser1.score
            },
            {
              id: looser2.userId,
              delta: looser2NewScore - looser2.score
            }
          ];
          this.getScores(msg.chat.id, playedGamers).then((text) => {
            text = `new scores:\n` + text;
            this.botApi.sendMessage(msg.chat.id, text, TEXT_PARSE_MODE as any);
          });

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
      });
  }

  protected updateScores(
    winner: IGamer,
    looser: IGamer
  ): Promise<UpdateScoresResult> {
    const expectedWinnerScore = this.eloRank.getExpected(
      winner.score,
      looser.score
    );
    const expectedLoserScore = this.eloRank.getExpected(
      looser.score,
      winner.score
    );

    const winnerScore = this.eloRank.updateRating(
      expectedWinnerScore,
      1,
      winner.score
    );
    const looserScore = this.eloRank.updateRating(
      expectedLoserScore,
      0,
      looser.score
    );

    const winnerUpdatePr = this.db.updateScore(winner, winnerScore);
    const loserUpdatePr = this.db.updateScore(looser, looserScore);

    return Promise.all([winnerUpdatePr, loserUpdatePr]).then(() => {
      return {
        winnerScore,
        looserScore
      };
    });
  }

  protected sendError(chatId: number, error: any): void {
    const text: string =
      typeof error === 'string' ? error : JSON.stringify(error);
    this.botApi.sendMessage(chatId, 'Some error - ' + text);
  }

  protected getScores = (
    chatId: number,
    playedGamers: Array<PlayedGamer> = []
  ): Promise<string> => {
    return this.db
      .getGroupGamers(chatId)
      .then((gamers) => {
        let text = '';
        for (let i = 0; i < gamers.length; ++i) {
          const gamer = gamers[i];
          const playedGamer = playedGamers.find((g) => g.id === gamer.userId);
          const line = `${i + 1}. ${gamer.username} - ${gamer.score}`;
          if (playedGamer !== undefined) {
            const sign = playedGamer.delta > 0 ? '+' : '';
            text += `<b>${line} (${sign}${playedGamer.delta})</b>`;
          } else {
            text += line;
          }
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
}

interface UpdateScoresResult {
  winnerScore: number;
  looserScore: number;
}

interface PlayedGamer {
  id: number;
  delta: number;
}
