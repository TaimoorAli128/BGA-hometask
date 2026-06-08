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
    // create genesis (ensure it's mined via createGenesisBlock)
    const genesis = this.createGenesisBlock(minerAddress);
    this.chain.push(genesis);
    // apply genesis utxos
    this.utxoSet.applyBlock(genesis.transactions);
  }

  createGenesisBlock(minerAddress) {
    const coinbase = Transaction.coinbase(minerAddress, MINING_REWARD);
    const g = createGenesisBlock(coinbase, this.difficulty);
    // ensure genesis meets difficulty
    g.mine();
    return g;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getDifficultyForNextBlock() {
    return this.difficulty;
  }

  validateTransactionInContext(tx, utxoSnapshot) {
    const snapshot = utxoSnapshot || this.utxoSet.clone();
    if (tx.isCoinbase()) return { valid: true, reason: null };
    // ensure inputs exist and sum inputs
    let inputSum = 0;
    for (const inp of tx.inputs) {
      const key = `${inp.txId}:${inp.outputIndex}`;
      const entry = snapshot.utxos ? snapshot.utxos.get(key) : snapshot.get(key);
      if (!entry) return { valid: false, reason: 'Referenced UTXO not found' };
      inputSum += entry.amount;
    }
    const outputSum = tx.outputs.reduce((s, o) => s + o.amount, 0);
    if (outputSum > inputSum) return { valid: false, reason: 'Outputs exceed inputs' };
    if (!tx.verify()) return { valid: false, reason: 'Invalid transaction signature' };
    return { valid: true, reason: null };
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
    // Validate transaction against utxo snapshot including current mempool
    const snapshot = this.getUtxoSnapshotIncludingMempool();
    const res = this.validateTransactionInContext(transaction, snapshot);
    if (!res || !res.valid) {
      const reason = res && res.reason ? res.reason : 'Invalid transaction';
      throw new Error(reason);
    }
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
    // add coinbase outputs to utxoSet (coinbase has no inputs to spend)
    for (let i = 0; i < coinbase.outputs.length; i++) {
      const out = coinbase.outputs[i];
      const key = `${coinbase.id}:${i}`;
      this.utxoSet.utxos.set(key, { txId: coinbase.id, outputIndex: i, address: out.address, amount: out.amount });
    }
    // apply pending transactions
    for (const tx of pending) {
      this.utxoSet.applyTransaction(tx);
    }
    // remove pending txs from mempool
    const ids = pending.map((t) => t.id);
    this.mempool.removeMany(ids);
    return block;
  }

  isChainValid() {
    const { sha256, meetsDifficulty } = require('../crypto/hash');
    const { MerkleTree } = require('./MerkleTree');
    const utxo = new UTXOSet();
    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      const prev = i === 0 ? null : this.chain[i - 1];
      // check previous hash linkage
      if (i === 0) {
        if (block.previousHash !== '0') return false;
      } else {
        if (block.previousHash !== prev.hash) return false;
      }
      // recompute merkle root
      const ids = (block.transactions || []).map((t) => t.id);
      const root = ids.length ? new MerkleTree(ids).root : null;
      if (block.merkleRoot !== root) return false;
      // recompute block hash
      const payload = JSON.stringify({ index: block.index, timestamp: block.timestamp, previousHash: block.previousHash, nonce: block.nonce, difficulty: block.difficulty, merkleRoot: block.merkleRoot });
      const calcHash = sha256(payload);
      if (calcHash !== block.hash) return false;
      if (!meetsDifficulty(block.hash, block.difficulty)) return false;
      // validate transactions in order against current utxo snapshot
      for (const tx of block.transactions) {
        const res = this.validateTransactionInContext(tx, utxo);
        if (!res || !res.valid) return false;
        // apply transaction to utxo replay
        utxo.applyTransaction(tx);
      }
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
