import { ITgMessage } from "../interfaces/ITgMessage";


export function createUsername(msg: ITgMessage): string {
  return msg.from.username || msg.from.last_name || msg.from.first_name || (Math.round(Math.random() * 1000) + '');
}

export function getUsernameFromText(text: string): string {
  const words = text.split(' ');
  if (words.length !== 2) {
    throw 'wrong command format';
  }
  return words[1];
}
