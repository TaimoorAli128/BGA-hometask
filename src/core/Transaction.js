const { sha256 } = require('../crypto/hash');
const { COINBASE_TX_ID } = require('../config');
const { signData, verifySignature } = require('../crypto/keyPair');
/** @see tests/unit/core/Transaction*.test.js */
class Transaction {
  constructor(inputs = [], outputs = [], timestamp = Date.now()) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.timestamp = timestamp;
    this.signatures = {};
    this.id = this.calculateId();
  }

  static coinbase(recipientAddress, amount, timestamp = Date.now()) {
    const tx = new Transaction(
      [{ txId: COINBASE_TX_ID, outputIndex: 0, signature: null }],
      [{ address: recipientAddress, amount }],
      timestamp
    );
    tx.id = tx.calculateId();
    return tx;
  }

  static create(senderAddress, recipientAddress, amount, utxos, changeAddress) {
    // utxos: array of { txId, outputIndex, amount }
    let total = 0;
    const inputs = [];
    for (const u of utxos) {
      inputs.push({ txId: u.txId, outputIndex: u.outputIndex, signature: null });
      total += u.amount;
      if (total >= amount) break;
    }
    if (total < amount) throw new Error('Insufficient balance');
    const outputs = [{ address: recipientAddress, amount }];
    const change = total - amount;
    if (change > 0) outputs.push({ address: changeAddress, amount: change });
    const tx = new Transaction(inputs, outputs);
    tx.id = tx.calculateId();
    return tx;
  }

  calculateId() {
    return sha256(JSON.stringify({ inputs: this.inputs, outputs: this.outputs, timestamp: this.timestamp }));
  }

  getSigningPayload(inputIndex) {
    // payload should be deterministic and exclude signatures
    return sha256(JSON.stringify({ id: this.id, inputIndex, outputs: this.outputs, timestamp: this.timestamp }));
  }

  sign(privateKey, publicKey) {
    if (this.isCoinbase()) throw new Error('Cannot sign coinbase');
    // sign each input
    for (let i = 0; i < this.inputs.length; i++) {
      const payload = this.getSigningPayload(i);
      this.signatures[i] = signData(privateKey, payload);
    }
    // attach public key for verification
    this.signatures._publicKey = publicKey;
    return this;
  }

  verify() {
    if (this.isCoinbase()) return true;
    const pub = this.signatures._publicKey;
    if (!pub) return false;
    for (let i = 0; i < this.inputs.length; i++) {
      const sig = this.signatures[i];
      if (!sig) return false;
      const payload = this.getSigningPayload(i);
      if (!verifySignature(pub, payload, sig)) return false;
    }
    return true;
  }

  isCoinbase() {
    return this.inputs.length > 0 && this.inputs[0].txId === COINBASE_TX_ID;
  }

  spendFromSnapshot(utxoSnapshot) {
    // utxoSnapshot is a UTXOSet-like map of keys
    for (const inp of this.inputs) {
      const key = `${inp.txId}:${inp.outputIndex}`;
      if (!utxoSnapshot.has(key)) throw new Error('Missing UTXO');
      utxoSnapshot.delete(key);
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      inputs: this.inputs,
      outputs: this.outputs,
      timestamp: this.timestamp,
      signatures: this.signatures,
    };
  }

  static fromJSON(data) {
    const tx = new Transaction(data.inputs, data.outputs, data.timestamp);
    tx.signatures = data.signatures || {};
    tx.id = data.id;
    return tx;
  }
}

module.exports = { Transaction };
