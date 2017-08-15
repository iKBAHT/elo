import TelegramBot = require('node-telegram-bot-api');
import { Bot } from "./Bot";
import { SqlLiteManager } from "./db/SqlLiteManager";


const token = '347008425:AAFy5zzQEXIlPfeVLZy3gvZ1Z5JetAnzH1U';
const botApi = new TelegramBot(token, { polling: true });

const db = new SqlLiteManager();
const bot = new Bot(botApi, db);
bot.init();
