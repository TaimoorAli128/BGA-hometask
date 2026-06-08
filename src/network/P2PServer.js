const http = require('http');
const WebSocket = require('ws');
const { Block } = require('../core/Block');

/** Minimal P2P server used by tests */
class P2PServer {
  constructor(blockchain, port = 6001) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = null; // http server
    this.wss = null; // websocket server
  }

  listen() {
    const httpServer = http.createServer();
    const wss = new WebSocket.Server({ server: httpServer });
    this.server = httpServer;
    this.wss = wss;
    wss.on('connection', (ws) => {
      this.connectSocket(ws);
    });
    // Start listening synchronously; 'listening' will fire asynchronously
    // after the test attaches its listener
    httpServer.listen(this.port);
    return { server: httpServer };
  }

  connectSocket(ws) {
    this.sockets.push(ws);
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        this.handleMessage(ws, data);
      } catch (e) {
        // ignore
      }
    });
    ws.on('close', () => {
      this.sockets = this.sockets.filter((s) => s !== ws);
    });
    // send current chain on new connection
    this.sendChain(ws);
  }

  connectToPeer(host, port) {
    const url = `ws://${host}:${port}`;
    const ws = new WebSocket(url);
    ws.on('open', () => this.connectSocket(ws));
    ws.on('error', (err) => {
      // log but don't throw
    });
    return ws;
  }

  handleMessage(socket, data) {
    if (!data || !data.type) return;
    if (data.type === 'CHAIN') {
      // accept remote chain (array of block JSON)
      try {
        const chain = (data.chain || []).map((b) => Block.fromJSON(b));
        this.blockchain.replaceChain(chain);
      } catch (e) {
        // ignore
      }
    } else if (data.type === 'TX') {
      // broadcast transaction to local mempool
      try {
        const tx = data.transaction;
        // Attempt to add transaction if possible
        // if tx is plain JSON, Transaction.fromJSON will be used by add logic elsewhere
        this.blockchain.addTransaction(tx);
      } catch (e) {
        // ignore
      }
    }
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    for (const s of this.sockets) {
      if (s.readyState === WebSocket.OPEN) s.send(payload);
    }
  }

  broadcastTransaction(transaction) {
    this.broadcast({ type: 'TX', transaction });
  }

  broadcastChain() {
    const chain = this.blockchain.chain.map((b) => b.toJSON());
    this.broadcast({ type: 'CHAIN', chain });
  }

  sendChain(socket) {
    const chain = this.blockchain.chain.map((b) => b.toJSON());
    try { socket.send(JSON.stringify({ type: 'CHAIN', chain })); } catch (e) {}
  }
}

module.exports = { P2PServer };
