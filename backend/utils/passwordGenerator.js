const crypto = require("crypto");

// Characters deliberately exclude visually ambiguous characters:
// I, O, 0, 1, l
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

function randomCharacter(characters) {
  const index = crypto.randomInt(0, characters.length);
  return characters[index];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function generatePassword(length = 16, includeSymbols = true) {
  const characterPool =
    LOWERCASE +
    UPPERCASE +
    NUMBERS +
    (includeSymbols ? SYMBOLS : "");

  const passwordCharacters = [];

  // Ensure the generated password contains characters
  // from the available character categories.
  passwordCharacters.push(randomCharacter(LOWERCASE));
  passwordCharacters.push(randomCharacter(UPPERCASE));
  passwordCharacters.push(randomCharacter(NUMBERS));

  if (includeSymbols) {
    passwordCharacters.push(randomCharacter(SYMBOLS));
  }

  while (passwordCharacters.length < length) {
    passwordCharacters.push(randomCharacter(characterPool));
  }

  return shuffle(passwordCharacters).join("");
}

module.exports = {
  generatePassword,
};