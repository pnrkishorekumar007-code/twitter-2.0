// Random password using only uppercase + lowercase letters (no numbers/symbols)
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateLetterPassword(length = 12) {
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return pwd;
}
