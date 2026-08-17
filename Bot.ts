import TelegramBot from 'node-telegram-bot-api';
import { IDb } from './db/IDb';
import { IGamer } from './interfaces/IGamer';
import { IGame } from './interfaces/IGame';
import { IUser } from './interfaces/IUser';
import { ITgMessage } from './interfaces/ITgMessage';
import { defaultScore } from './rating/settings';
import {
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
    const ensureChat = this.ensureChat;
    this.botApi.onText(/^\/join$/i, (msg) => ensureChat(msg) && this.join(msg));
    this.botApi.onText(/^\/scores$/i, (msg) => ensureChat(msg) && this.getAllScores(msg));
    this.botApi.onText(/^\/stats$/i, (msg) => ensureChat(msg) && this.getAllStats(msg));
    this.botApi.onText(/^\/undo$/i, (msg) => ensureChat(msg) && this.undo(msg));
    this.botApi.onText(/^\/redo$/i, (msg) => ensureChat(msg) && this.redo(msg));
    this.botApi.onText(/^\/iwon /i, (msg) => ensureChat(msg) && this.win(msg));
    this.botApi.onText(/^\/iwonWithMars/i, (msg) => ensureChat(msg) && this.winMars(msg));
    this.botApi.onText(/^\/ilost /i, (msg) => ensureChat(msg) && this.lose(msg));
    this.botApi.onText(/^\/ilostWithMars/i, (msg) => ensureChat(msg) && this.loseMars(msg));
    this.botApi.onText(/^\/help$/i, (msg) => ensureChat(msg) && this.help(msg));
  }

  protected ensureChat = (msg: ITgMessage): boolean => {
    const chatId = msg.chat.id;
    const now = Math.floor(Date.now() / 1000);
    this.db.upsertChat({
      id: chatId,
      title: msg.chat.title || '',
      created_at: now,
      updated_at: now,
      deleted_at: null as number | null
    }).catch(() => {});
    return true;
  };

  protected join = (msg: ITgMessage): void => {
    const now = Date.now();
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const user: IUser = {
      id: userId,
      username: msg.from.username || '',
      first_name: msg.from.first_name || '',
      last_name: msg.from.last_name || '',
      created_at: Math.floor(now / 1000),
      updated_at: Math.floor(now / 1000),
      deleted_at: null as number | null
    };

    this.db.upsertUser(user)
      .then(() => {
        return this.db.getGamer({ chat_id: chatId, user_id: userId });
      })
      .then(() => {
        this.sendError(msg.chat.id, 'user already exist');
      })
      .catch((err: any) => {
        if (err === 'no result') {
          const gamer: IGamer = {
            chat_id: chatId,
            user_id: userId,
            score: defaultScore,
            best_score: defaultScore,
            created_at: Math.floor(now / 1000),
            updated_at: Math.floor(now / 1000),
            deleted_at: null as number | null
          };
          this.db.createGamer(gamer)
            .then(() => {
              this.botApi.sendMessage(msg.chat.id, 'Welcome ' + user.username);
            })
            .catch((err: any) => {
              this.sendError(msg.chat.id, err);
            });
        } else {
          this.sendError(msg.chat.id, err);
        }
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
    const looserPr = this.db.getGamerByUsername(loserUsername, msg.chat.id);
    const winnerPr = this.db.getGamer({
      chat_id: msg.chat.id,
      user_id: msg.from.id
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
    const looserPr = this.db.getGamerByUsername(loserUsername, msg.chat.id);
    const winnerPr = this.db.getGamer({
      chat_id: msg.chat.id,
      user_id: msg.from.id
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
    const winnerPr = this.db.getGamerByUsername(winnerUsername, msg.chat.id);
    const looserPr = this.db.getGamer({
      chat_id: msg.chat.id,
      user_id: msg.from.id
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
    const winnerPr = this.db.getGamerByUsername(winnerUsername, msg.chat.id);
    const looserPr = this.db.getGamer({
      chat_id: msg.chat.id,
      user_id: msg.from.id
    });
    this.changeGamersInfo(winnerPr, looserPr, msg, true);
  };

  protected undo = (msg: ITgMessage): void => {
    this.db.getLatestGameByDeclarer(msg.chat.id, msg.from.id)
      .then((game) => {
        if (!game) {
          this.botApi.sendMessage(msg.chat.id, 'No game to undo.');
          return Promise.resolve();
        }
        // Delete bot announcement
        return this.botApi.deleteMessage(msg.chat.id, game.announcement_id)
          .then(() => {
            return this.db.softDeleteGame(game.id);
          })
          .then(() => {
            this.botApi.sendMessage(msg.chat.id, 'Game undone.');
          });
      })
      .catch(() => {
        this.botApi.sendMessage(msg.chat.id, 'Undo failed — message not accessible.');
      });
  };

  protected redo = (msg: ITgMessage): void => {
    this.db.getLatestDeletedGameByDeclarer(msg.chat.id, msg.from.id)
      .then((game) => {
        if (!game) {
          this.botApi.sendMessage(msg.chat.id, 'No game to redo.');
          return Promise.resolve();
        }
        // Reconstruct message
        const deltaScore = game.winner_score_after - game.winner_score_before;

        // Get usernames
        return Promise.all([
          this.db.getUser(game.winner_user_id),
          this.db.getUser(game.loser_user_id)
        ]).then(([winner, loser]) => {
          let text = `new scores (diff ${deltaScore}):\n`;
          text += `${winner.username} - ${game.winner_score_after}\n`;
          text += `${loser.username} - ${game.loser_score_after}`;

          return this.botApi.sendMessage(msg.chat.id, text).then((sentMsg) => {
            return Promise.all([
              this.db.undeleteGame(game.id),
              this.db.updateGameAnnouncement(game.id, sentMsg.message_id)
            ]);
          }).then(() => {
            this.botApi.sendMessage(msg.chat.id, 'Game redone.');
          });
        });
      })
      .catch((err: any) => {
        this.sendError(msg.chat.id, err);
      });
  };

  protected help = (msg: ITgMessage): void => {
    let text = '';
    text += '<b>/join</b> - join to the raiting\n';
    text += '<b>/scores</b> - get total scores\n';
    text += '<b>/stats</b> - get statistics\n';
    text += '<b>/undo</b> - undo your last game\n';
    text += '<b>/redo</b> - redo your last undone game\n';
    text += '<b>/iwon</b> username - your victory over username\n';
    text += '<b>/iwonWithMars</b> username - your victory with mars over username\n';
    text += '<b>/ilost</b> username - your defeat from username\n';
    text += '<b>/ilostWithMars</b> username - your defeat with mars from username\n';
    this.botApi.sendMessage(msg.chat.id, text, TEXT_PARSE_MODE as any);
  };

  protected changeGamersInfo(
    winnerPr: Promise<IGamer & { username: string }>,
    looserPr: Promise<IGamer & { username: string }>,
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
        return this.updateScores(winner, looser, isMars, msg).then((info) => {
          const deltaScore = info.winnerScore - winner.score;
          let text = `new scores (diff ${deltaScore}):\n`;
          text += `${winner.username} - ${info.winnerScore}\n`;
          text += `${looser.username} - ${info.looserScore}`;
          return this.db.getTopGroupGamer(msg.chat.id).then((newChampion) => {
            if (newChampion.user_id !== champion.user_id) {
              text += `\n\nWe have the new leader!\n🎉 ${newChampion.username}`;
            }
            return { text, gameId: info.gameId };
          });
        }).then((result) => {
          return this.botApi.sendMessage(msg.chat.id, result.text).then((sentMsg) => {
            return this.db.updateGameAnnouncement(result.gameId, sentMsg.message_id);
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
    winner: any,
    looser: any,
    isMars: boolean,
    msg: ITgMessage
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

    const updatedWinner: IGamer = {
      chat_id: winner.chat_id,
      user_id: winner.user_id,
      score: newWinnerScore,
      best_score: 0,
      created_at: winner.created_at,
      updated_at: winner.updated_at,
      deleted_at: winner.deleted_at
    };

    const updatedLooser: IGamer = {
      chat_id: looser.chat_id,
      user_id: looser.user_id,
      score: newLoserScore,
      best_score: 0,
      created_at: looser.created_at,
      updated_at: looser.updated_at,
      deleted_at: looser.deleted_at
    };

    const winnerUpdatePr = this.db.updateGamer(updatedWinner);
    const loserUpdatePr = this.db.updateGamer(updatedLooser);

    const now = Math.floor(Date.now() / 1000);
    const game: IGame = {
      id: 0,
      chat_id: msg.chat.id,
      winner_user_id: winner.user_id,
      loser_user_id: looser.user_id,
      declarer_user_id: msg.from.id,
      is_mars: isMars,
      winner_score_before: winner.score,
      winner_score_after: newWinnerScore,
      loser_score_before: looser.score,
      loser_score_after: newLoserScore,
      created_at: now,
      updated_at: now,
      deleted_at: null as number | null,
      announcement_id: 0
    };
    const gamePr = this.db.createGame(game);

    return Promise.all([winnerUpdatePr, loserUpdatePr, gamePr]).then((results) => {
      return {
        winnerScore: newWinnerScore,
        looserScore: newLoserScore,
        gameId: results[2]
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
          const line = `${i + 1}. ${gamers[i].username} - ${gamers[i].score}`;
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
          const line = `${i + 1}. ${g.username} - [score ${g.score}]`;

          if (g.games_count === 0) {
            text += line + ' not enough data';
          } else {
            const winRate = getPercentFormatting(g.wins_count / g.games_count);
            const marsWinRate = getPercentFormatting(
              g.mars_wins_count / g.games_count
            );
            const marsLossRate = getPercentFormatting(
              g.mars_loses_count / g.games_count
            );
            text += line + ` [best score ${g.best_score}] [win rate ${winRate}] [win rate by mars ${marsWinRate}] [loss rate by mars ${marsLossRate}] [games ${g.games_count}]`;
          }

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
  gameId: number;
}
