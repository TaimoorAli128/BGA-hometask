const { notImplemented } = require('../util/notImplemented');
/** @see tests/unit/core/UTXOSet.test.js */
class UTXOSet {
  constructor() {
    this.utxos = new Map();
  }

  static key(txId, outputIndex) {
    return `${txId}:${outputIndex}`;
  }

  add(tx) {
    // add outputs as unspent
    for (let i = 0; i < tx.outputs.length; i++) {
      const out = tx.outputs[i];
      const key = UTXOSet.key(tx.id, i);
      this.utxos.set(key, { txId: tx.id, outputIndex: i, address: out.address, amount: out.amount });
    }
  }

  spend(tx) {
    for (const inp of tx.inputs) {
      const key = UTXOSet.key(inp.txId, inp.outputIndex);
      this.utxos.delete(key);
    }
  }

  applyTransaction(tx) {
    // remove spent inputs, then add outputs
    this.spend(tx);
    this.add(tx);
  }

  applyBlock(transactions) {
    for (const tx of transactions) {
      this.applyTransaction(tx);
    }
  }

  getBalance(address) {
    let sum = 0;
    for (const v of this.utxos.values()) {
      if (v.address === address) sum += v.amount;
    }
    return sum;
  }

  getUnspentForAddress(address) {
    const res = [];
    for (const v of this.utxos.values()) {
      if (v.address === address) res.push({ txId: v.txId, outputIndex: v.outputIndex, amount: v.amount });
    }
    return res;
  }

  has(txId, outputIndex) {
    return this.utxos.has(UTXOSet.key(txId, outputIndex));
  }

  clone() {
    const copy = new UTXOSet();
    copy.utxos = new Map(this.utxos);
    return copy;
  }

  toJSON() {
    return Array.from(this.utxos.entries());
  }

  static fromJSON(entries) {
    const set = new UTXOSet();
    set.utxos = new Map(entries);
    return set;
  }
}

module.exports = { UTXOSet };
