const crypto = require('crypto');

/** @see tests/unit/crypto/hash.test.js */
function sha256(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
}

function hashObject(obj) {
  // Serialize object deterministically (JSON.stringify preserves key order)
  // Tests expect key order to affect hash, so default stringify is acceptable.
  return sha256(JSON.stringify(obj));
}

function meetsDifficulty(hash, difficulty) {
  if (!Number.isInteger(difficulty) || difficulty === 0) return difficulty === 0 ? true : false;
  // Count leading hex zero characters
  let count = 0;
  for (let i = 0; i < hash.length && count < difficulty; i++) {
    if (hash[i] === '0') count++; else break;
  }
  return count >= difficulty;
}

module.exports = { sha256, hashObject, meetsDifficulty };
