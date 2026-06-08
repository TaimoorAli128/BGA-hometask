const fs = require('fs/promises');
const { Blockchain } = require('../core/Blockchain');

/** @see tests/storage/persistence.test.js */
async function saveChain(filePath, blockchain) {
  const data = blockchain.toJSON();
  await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
}

async function loadChain(filePath, minerAddress) {
  const content = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(content);
  return Blockchain.fromJSON(data, minerAddress);
}

module.exports = { saveChain, loadChain };
