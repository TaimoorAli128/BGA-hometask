const { notImplemented } = require('../util/notImplemented');
/** @see tests/unit/core/Mempool.test.js */
class Mempool {
  constructor() {
    this.transactions = new Map();
  }

  add(transaction) {
    if (transaction.isCoinbase && transaction.isCoinbase()) throw new Error('Coinbase transactions cannot be added to mempool');
    if (this.transactions.has(transaction.id)) throw new Error('Transaction already in mempool');
    if (typeof transaction.verify === 'function' && !transaction.verify()) throw new Error('Invalid transaction signature');
    this.transactions.set(transaction.id, transaction);
    return transaction.id;
  }

  remove(transactionId) {
    this.transactions.delete(transactionId);
  }

  removeMany(ids) {
    for (const id of ids) this.remove(id);
  }

  getPending(limit = 100) {
    return Array.from(this.transactions.values()).slice(0, limit);
  }

  has(transactionId) {
    return this.transactions.has(transactionId);
  }

  clear() {
    this.transactions.clear();
  }

  size() {
    return this.transactions.size;
  }
}

module.exports = { Mempool };
