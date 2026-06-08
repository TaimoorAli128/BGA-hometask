const { sha256, hashObject, meetsDifficulty } = require('../crypto/hash');
const { MerkleTree } = require('./MerkleTree');
const { Transaction } = require('./Transaction');
/** @see tests/unit/core/Block*.test.js */
class Block {
  constructor(
    index,
    timestamp,
    transactions,
    previousHash,
    nonce = 0,
    difficulty = 2,
    hash = null
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.merkleRoot = null;
    this.hash = hash || this.calculateHash();
  }

  computeMerkleRoot() {
    const ids = this.transactions.map((t) => t.id);
    const tree = new MerkleTree(ids);
    this.merkleRoot = tree.root;
    return this.merkleRoot;
  }

  calculateHash() {
    const payload = JSON.stringify({ index: this.index, timestamp: this.timestamp, previousHash: this.previousHash, nonce: this.nonce, difficulty: this.difficulty, merkleRoot: this.merkleRoot });
    this.hash = sha256(payload);
    return this.hash;
  }

  mine() {
    this.computeMerkleRoot();
    this.nonce = 0;
    this.calculateHash();
    while (!meetsDifficulty(this.hash, this.difficulty)) {
      this.nonce += 1;
      this.calculateHash();
    }
    return this;
  }

  isValid(previousBlock) {
    // check merkle root
    const root = (new MerkleTree(this.transactions.map((t) => t.id))).root;
    if (root !== this.merkleRoot) return false;
    // check previous hash linkage
    if (previousBlock && this.previousHash !== previousBlock.hash) return false;
    // check difficulty
    if (!meetsDifficulty(this.hash, this.difficulty)) return false;
    // check transactions
    for (const tx of this.transactions) {
      if (!tx.verify()) return false;
    }
    return true;
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map((t) => t.toJSON ? t.toJSON() : t),
      previousHash: this.previousHash,
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot,
      hash: this.hash,
    };
  }

  static fromJSON(data) {
    const transactions = (data.transactions || []).map((t) => Transaction.fromJSON ? Transaction.fromJSON(t) : t);
    const b = new Block(data.index, data.timestamp, transactions, data.previousHash, data.nonce, data.difficulty, data.hash);
    b.merkleRoot = data.merkleRoot;
    return b;
  }
}

function createGenesisBlock(coinbaseTx, difficulty = 2) {
  const b = new Block(0, Date.now(), [coinbaseTx], '0', 0, difficulty);
  b.computeMerkleRoot();
  b.calculateHash();
  return b;
}

module.exports = { Block, createGenesisBlock };
