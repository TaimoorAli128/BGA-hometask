const { Transaction } = require('./Transaction');
const { Block, createGenesisBlock } = require('./Block');
const { Mempool } = require('./Mempool');
const { UTXOSet } = require('./UTXOSet');
const { MINING_REWARD } = require('../config');

/** @see tests/unit/core/Blockchain*.test.js and tests/integration/* */
class Blockchain {
  constructor(minerAddress, difficulty = 2) {
    this.difficulty = difficulty;
    this.mempool = new Mempool();
    this.utxoSet = new UTXOSet();
    this.chain = [];
    this.minerAddress = minerAddress;
    // create genesis
    const coinbase = Transaction.coinbase(minerAddress, MINING_REWARD);
    const genesis = createGenesisBlock(coinbase, this.difficulty);
    this.chain.push(genesis);
    // apply genesis utxos
    this.utxoSet.applyBlock(genesis.transactions);
  }

  createGenesisBlock(minerAddress) {
    const coinbase = Transaction.coinbase(minerAddress, MINING_REWARD);
    return createGenesisBlock(coinbase, this.difficulty);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getDifficultyForNextBlock() {
    return this.difficulty;
  }

  validateTransactionInContext(tx, utxoSnapshot) {
    if (tx.isCoinbase()) return true;
    if (!tx.verify()) return false;
    // ensure inputs are present
    for (const inp of tx.inputs) {
      const key = `${inp.txId}:${inp.outputIndex}`;
      if (!utxoSnapshot.has(key)) return false;
    }
    return true;
  }

  getUtxoSnapshotIncludingMempool(excludeTxId = null) {
    const snapshot = this.utxoSet.clone();
    const pending = this.mempool.getPending();
    for (const tx of pending) {
      if (excludeTxId && tx.id === excludeTxId) continue;
      // apply to snapshot (consume inputs)
      for (const inp of tx.inputs) {
        const key = `${inp.txId}:${inp.outputIndex}`;
        snapshot.utxos.delete(key);
      }
      // add outputs
      for (let i = 0; i < tx.outputs.length; i++) {
        const out = tx.outputs[i];
        const key = `${tx.id}:${i}`;
        snapshot.utxos.set(key, { txId: tx.id, outputIndex: i, address: out.address, amount: out.amount });
      }
    }
    return snapshot;
  }

  addTransaction(transaction) {
    return this.mempool.add(transaction);
  }

  minePendingTransactions(minerAddress) {
    const pending = this.mempool.getPending(1000);
    const coinbase = Transaction.coinbase(minerAddress, MINING_REWARD);
    const txs = [coinbase, ...pending];
    const previousHash = this.getLatestBlock().hash;
    const block = new Block(this.chain.length, Date.now(), txs, previousHash, 0, this.getDifficultyForNextBlock());
    block.mine();
    this.chain.push(block);
    // apply to utxoSet
    this.utxoSet.applyBlock(txs);
    // remove pending txs from mempool
    const ids = pending.map((t) => t.id);
    this.mempool.removeMany(ids);
    return block;
  }

  isChainValid() {
    // basic chain validation by replaying utxos
    const utxo = new UTXOSet();
    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      const prev = i === 0 ? null : this.chain[i - 1];
      if (!block.isValid(prev)) return false;
      // apply transactions
      utxo.applyBlock(block.transactions);
    }
    return true;
  }

  getBalance(address) {
    return this.utxoSet.getBalance(address);
  }

  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) return false;
    // naive replace
    this.chain = newChain;
    return true;
  }

  toJSON() {
    return {
      difficulty: this.difficulty,
      chain: this.chain.map((b) => b.toJSON()),
    };
  }

  static fromJSON(data, minerAddress) {
    const bc = new Blockchain(minerAddress, data.difficulty || 2);
    bc.chain = (data.chain || []).map((b) => Block.fromJSON(b));
    // rebuild utxo
    bc.utxoSet = new UTXOSet();
    for (const block of bc.chain) bc.utxoSet.applyBlock(block.transactions);
    return bc;
  }
}

module.exports = { Blockchain };
