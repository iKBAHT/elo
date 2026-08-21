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

function removeDogFromStart(word: string): string {
  if (word.charAt(0) === '@') {
    return word.substr(1);
  }
  return word;
}

// 0.1239 => 12.4%
export function getPercentFormatting(value: number): string {
  return Math.round(value * 1000) / 10 + '%';
}
