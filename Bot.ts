import TelegramBot = require('node-telegram-bot-api');
import { IDb } from "./db/IDb";
import { IGamer } from "./interfaces/IGamer";
import { ITgMessage } from "./interfaces/ITgMessage";
import { defaultScore } from "./rating/settings";
import { createUsername, getUsernameFromText, get3UsernamesFromText } from "./rating/utils";
const EloRank = require('elo-rank');

const TEXT_PARSE_MODE = { parse_mode: 'HTML' };

export class Bot {
  protected eloRank = new EloRank();

  constructor(
    protected botApi: TelegramBot,
    protected db: IDb
  ) { }

  init(): void {
    this.botApi.onText(/^\/join$/i, this.join);
    this.botApi.onText(/^\/score$/i, this.getScore);
    this.botApi.onText(/^\/scores$/i, this.getAllScores);
    this.botApi.onText(/^\/iwon/i, this.win);
    this.botApi.onText(/^\/iw/i, this.win);
    this.botApi.onText(/^\/ilost/i, this.lose);
    this.botApi.onText(/^\/help$/i, this.help);
    this.botApi.onText(/^\/wewon/i, this.weWin);
    this.botApi.onText(/^\/ww/i, this.weWin);
    this.botApi.onText(/^\/welost/i, this.weLose);
  }

  protected join = (msg: ITgMessage): void => {
    const gamer: IGamer = {
      groupId: msg.chat.id,
      userId: msg.from.id,
      username: createUsername(msg),
      score: defaultScore
    }
    this.db.create(gamer)
      .then(() => {
        this.botApi.sendMessage(msg.chat.id, 'Welcome ' + gamer.username);
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  }

  protected getScore = (msg: ITgMessage): void => {
    this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id })
      .then(gamer => {
        this.botApi.sendMessage(msg.chat.id, `${gamer.username}  score  ${gamer.score}`);
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  }

  protected getAllScores = (msg: ITgMessage): void => {
    this.getScores(msg.chat.id)
      .then(text => {
        text = 'scores:\n' + text;
        this.botApi.sendMessage(msg.chat.id, text);
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  }

  protected win = (msg: ITgMessage): void => {
    try {
      var loserUsername = getUsernameFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const looserPr = this.db.getGamerByUsername(msg.chat.id, loserUsername);
    const winnerPr = this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id });
    this.changeScores(winnerPr, looserPr, msg);
  }

  protected lose = (msg: ITgMessage): void => {
    try {
      var winnerUsername = getUsernameFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const winnerPr = this.db.getGamerByUsername(msg.chat.id, winnerUsername);
    const looserPr = this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id });
    this.changeScores(winnerPr, looserPr, msg);
  }

  protected help = (msg: ITgMessage): void => {
    let text = '';
    text += '<b>/join</b> - join to the raiting\n';
    text += '<b>/score</b> - get your score\n';
    text += '<b>/scores</b> - get total scores\n';
    text += '<b>/iwon</b> username - your victory over username\n';
    text += '<b>/ilost</b> username - your defeat from username\n';
    text += '<b>/wewon</b> partner opponent1 opponent2 - your and partners victory over opponent1 and opponent2\n';
    text += '<b>/welost</b> partner opponent1 opponent2 - your and partner defeat for opponent1 and opponent2\n';
    text += '<b>/iw</b> - alias for <b>/iwon</b>\n';
    text += '<b>/ww</b> - alias for <b>/wewon</b>\n';
    this.botApi.sendMessage(msg.chat.id, text, TEXT_PARSE_MODE);
  }

  protected changeScores(winnerPr: Promise<IGamer>, looserPr: Promise<IGamer>, msg: ITgMessage): void {
    const championPr = this.db.getTopGroupGamer(msg.chat.id);
    Promise.all([winnerPr, looserPr, championPr])
      .then(gamers => {
        const winner = gamers[0];
        const looser = gamers[1];
        const champion = gamers[2];

        return this.updateScores(winner, looser)
          .then(info => {
            const deltaScore = info.winnerScore - winner.score;
            let text = `new scores (diff ${deltaScore}):\n`;
            text += `${winner.username} - ${info.winnerScore}\n`;
            text += `${looser.username} - ${info.looserScore}`;
            this.botApi.sendMessage(msg.chat.id, text);

            return this.db.getTopGroupGamer(msg.chat.id)
              .then(newChampion => {
                if (newChampion.userId !== champion.userId) {
                  let newChampionText = 'We have the new leader - ' + newChampion.username;
                  this.botApi.sendMessage(msg.chat.id, newChampionText);
                }
              });
          });
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  }

  protected weWin = (msg: ITgMessage): void => {
    try {
      var usernames = get3UsernamesFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const winner1Pr = this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id });
    const winner2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[0]);
    const looser1Pr = this.db.getGamerByUsername(msg.chat.id, usernames[1]);
    const looser2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[2]);
    this.changeScores2x2(winner1Pr, winner2Pr, looser1Pr, looser2Pr, msg);
  }

  protected weLose = (msg: ITgMessage): void => {
    try {
      var usernames = get3UsernamesFromText(msg.text);
    } catch (err) {
      this.botApi.sendMessage(msg.chat.id, err);
      return;
    }
    const looser1Pr = this.db.getGamer({ userId: msg.from.id, groupId: msg.chat.id });
    const looser2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[0]);
    const winner1Pr = this.db.getGamerByUsername(msg.chat.id, usernames[1]);
    const winner2Pr = this.db.getGamerByUsername(msg.chat.id, usernames[2]);
    this.changeScores2x2(winner1Pr, winner2Pr, looser1Pr, looser2Pr, msg);
  }

  protected changeScores2x2(
    winner1Pr: Promise<IGamer>, winner2Pr: Promise<IGamer>,
    looser1Pr: Promise<IGamer>, looser2Pr: Promise<IGamer>,
    msg: ITgMessage
  ): void {
    const championPr = this.db.getTopGroupGamer(msg.chat.id);
    Promise.all([winner1Pr, winner2Pr, looser1Pr, looser2Pr, championPr])
      .then(gamers => {
        const winner1 = gamers[0];
        const winner2 = gamers[1];
        const looser1 = gamers[2];
        const looser2 = gamers[3];
        const champion = gamers[4];

        let strongWinner: IGamer;
        let weakWinner: IGamer;
        if (winner1.score > winner2.score) {
          strongWinner = winner1;
          weakWinner = winner2;
        } else {
          strongWinner = winner2;
          weakWinner = winner1;
        }

        let strongLooser: IGamer;
        let weakLooser: IGamer;
        if (looser1.score > looser2.score) {
          strongLooser = looser1;
          weakLooser = looser2;
        } else {
          strongLooser = looser2;
          weakLooser = looser1;
        }

        const firstUpdate = this.updateScores(strongWinner, strongLooser);
        const secondUpdate = this.updateScores(weakWinner, weakLooser);
        return Promise.all([firstUpdate, secondUpdate])
          .then(([strongScore, weakScore]) => {
            const playedGamers: Array<PlayedGamer> = [
              { id: strongWinner.userId, delta: strongScore.winnerScore - strongWinner.score },
              { id: weakWinner.userId, delta: weakScore.winnerScore - weakWinner.score },
              { id: strongLooser.userId, delta: strongScore.looserScore - strongLooser.score },
              { id: weakLooser.userId, delta: weakScore.looserScore - weakLooser.score }
            ];
            this.getScores(msg.chat.id, playedGamers)
              .then(text => {
                text = `new scores:\n` + text;
                this.botApi.sendMessage(msg.chat.id, text, TEXT_PARSE_MODE);
              });

            return this.db.getTopGroupGamer(msg.chat.id)
              .then(newChampion => {
                if (newChampion.userId !== champion.userId) {
                  let newChampionText = 'We have the new leader - ' + newChampion.username;
                  this.botApi.sendMessage(msg.chat.id, newChampionText);
                }
              });
          });
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  }

  protected updateScores(winner: IGamer, looser: IGamer): Promise<UpdateScoresResult> {
    const expectedWinnerScore = this.eloRank.getExpected(winner.score, looser.score);
    const expectedLoserScore = this.eloRank.getExpected(looser.score, winner.score);

    const winnerScore = this.eloRank.updateRating(expectedWinnerScore, 1, winner.score);
    const looserScore = this.eloRank.updateRating(expectedLoserScore, 0, looser.score);

    const winnerUpdatePr = this.db.updateScore(winner, winnerScore);
    const loserUpdatePr = this.db.updateScore(looser, looserScore);

    return Promise
      .all([winnerUpdatePr, loserUpdatePr])
      .then(() => {
        return {
          winnerScore,
          looserScore,
        }
      });
  }

  protected sendError(chatId: number, error: any): void {
    const text: string = typeof error === 'string' ? error : JSON.stringify(error);
    this.botApi.sendMessage(chatId, 'Some error - ' + text);
  }

  protected getScores = (
    chatId: number,
    playedGamers: Array<PlayedGamer> = []
  ): Promise<string> => {
    return this.db.getGroupGamers(chatId)
      .then(gamers => {
        let text = '';
        for (let i = 0; i < gamers.length; ++i) {
          const gamer = gamers[i];
          const playedGamer = playedGamers.find(g => g.id === gamer.userId);
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
  }
}

interface UpdateScoresResult {
  winnerScore: number;
  looserScore: number;
}

interface PlayedGamer {
  id: number;
  delta: number;
}
