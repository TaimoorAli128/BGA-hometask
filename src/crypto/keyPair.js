const crypto = require('crypto');

/** @see tests/unit/crypto/keyPair.test.js */
function generateKeyPair() {
  // Use ECDSA secp256k1 curve
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function signData(privateKey, data) {
  const sign = crypto.createSign('SHA256');
  sign.update(String(data));
  sign.end();
  return sign.sign(privateKey, 'base64');
}

function verifySignature(publicKey, data, signature) {
  const verify = crypto.createVerify('SHA256');
  verify.update(String(data));
  verify.end();
  try {
    return verify.verify(publicKey, signature, 'base64');
  } catch (e) {
    return false;
  }
}

function publicKeyFingerprint(publicKey) {
  const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
  return hash.slice(0, 16);
}

module.exports = { generateKeyPair, signData, verifySignature, publicKeyFingerprint };
