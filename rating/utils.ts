import { ITgMessage } from "../interfaces/ITgMessage";


export function createUsername(msg: ITgMessage): string {
  return msg.from.username || msg.from.last_name || msg.from.first_name || (Math.round(Math.random() * 1000) + '');
}

/**
 * example - '/command @name1'
 */
export function getUsernameFromText(text: string): string {
  const words = text.trim().split(' ');
  if (words.length !== 2) {
    throw 'wrong command format';
  }
  let secondWord = removeDogFromStart(words[1]);
  return secondWord;
}

type usernames2x2 = [string, string, string];

/**
 * example - '/command @name1 @name2 @name3'
 */
export function get3UsernamesFromText(text: string): usernames2x2 {
  const words = text.trim().split(' ');
  if (words.length !== 4) {
    throw 'wrong command format';
  }
  const usernames = [words[1], words[2], words[3]];
  return usernames.map(removeDogFromStart) as usernames2x2;
}

function removeDogFromStart(word: string): string {
  if (word.charAt(0) === '@') {
    return word.substr(1);
  }
  return word;
}