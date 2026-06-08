const { sha256 } = require('../crypto/hash');
/** @see tests/unit/core/MerkleTree.test.js */
class MerkleTree {
  constructor(leaves = []) {
    this.leaves = leaves.slice();
    this.levels = [];
    if (!leaves || leaves.length === 0) {
      this.root = null;
      this.levels = [];
      return;
    }
    // hash leaves
    let current = leaves.map((l) => sha256(l));
    this.levels.push(current);
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : current[i];
        next.push(sha256(left + right));
      }
      current = next;
      this.levels.push(current);
    }
    this.root = this.levels[this.levels.length - 1][0] || null;
  }

  getProof(index) {
    if (!this.leaves || index < 0 || index >= this.leaves.length) return null;
    const proof = [];
    let idx = index;
    for (let level = 0; level < this.levels.length - 1; level++) {
      const levelNodes = this.levels[level];
      const isRight = idx % 2 === 1;
      const pairIndex = isRight ? idx - 1 : idx + 1;
      const sibling = pairIndex < levelNodes.length ? levelNodes[pairIndex] : levelNodes[idx];
      proof.push({ sibling, position: isRight ? 'left' : 'right' });
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  static verify(leaf, proof, root) {
    if (root === null) return leaf === null;
    let hash = sha256(leaf);
    if (!proof) return hash === root;
    for (const p of proof) {
      if (p.position === 'left') {
        hash = sha256(p.sibling + hash);
      } else {
        hash = sha256(hash + p.sibling);
      }
    }
    return hash === root;
  }
}

module.exports = { MerkleTree };
