const TelegramBot = require('node-telegram-bot-api');
const token = '347008425:AAFy5zzQEXIlPfeVLZy3gvZ1Z5JetAnzH1U';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  bot.sendMessage(msg.chat.id, "Hello dear user");
});

bot.onText(/\/sendpic/, (msg) => {
  bot.sendPhoto(msg.chat.id, "https://habrastorage.org/web/fe8/c82/a32/fe8c82a32b1548b1a297187e24ae755a.png");
  bot.sendMessage(msg.chat.id, JSON.stringify(msg));
});