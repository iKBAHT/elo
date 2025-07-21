import TelegramBot = require('node-telegram-bot-api');
import { Bot } from './Bot';
import { SqlLiteManager } from './db/SqlLiteManager';
require('dotenv').config();

const token = process.env.token;
const botApi = new TelegramBot(token, { polling: true });

const db = new SqlLiteManager();
const bot = new Bot(botApi, db);
bot.init();

botApi.getMe().then((info) => console.log(info));
