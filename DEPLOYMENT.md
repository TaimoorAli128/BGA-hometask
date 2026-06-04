# Deployment & Operations Runbook

## Overview

This document describes how to deploy, run, and operate the Blockchain Node application in production and development environments.

### Architecture
- **API Server**: REST endpoints on port 3001
- **P2P Network**: WebSocket communication on port 6001
- **Storage**: Persistent blockchain state (JSON-based)
- **Multi-node**: Supports clustering with docker-compose for development and testing

---

## Local Development

### Prerequisites
- Docker & Docker Compose v2.0+
- Node.js 18+ (for local development without Docker)

### Quick Start

#### Option 1: Docker Compose (Recommended)

Start a single-node development setup:
```bash
docker-compose up blockchain-node-1
```

The node will be available at:
- API: `http://localhost:3001`
- P2P: `ws://localhost:6001`

#### Option 2: Local Development (No Docker)

Install dependencies and run:
```bash
npm install
npm run dev
```

This starts the node with:
- API on port 3001
- P2P on port 6001

### Multi-Node Testing

To test P2P synchronization locally with multiple nodes:

```bash
docker-compose up blockchain-node-1 blockchain-node-2
```

This runs:
- Node 1: API on port 3001, P2P on port 6001
- Node 2: API on port 3002, P2P on port 6002

Nodes automatically peer with each other via the P2P network.

---

## Testing

### Run Tests Locally
```bash
npm install
npm test              # All tests
npm test -- --watch  # Watch mode
npm run test:coverage # With coverage report
```

### Run Tests in Docker
```bash
docker-compose --profile test run blockchain-test
```

---

## Production Deployment

### Docker Image

Build the production image:
```bash
docker build -t blockchain-hometask:latest .
```

Run a single instance:
```bash
docker run -d \
  --name blockchain-node \
  -p 3001:3001 \
  -p 6001:6001 \
  -e NODE_ENV=production \
  -v blockchain-data:/app/data \
  blockchain-hometask:latest
```

### Environment Variables

Configure the node with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment (production/development/test) |
| `PORT` | `3001` | API server port |
| `P2P_PORT` | `6001` | P2P WebSocket port |
| `NODE_ID` | Auto-generated | Unique node identifier |
| `PEER_ADDR` | Optional | Bootstrap peer address (ws://host:port) |
| `DATA_PATH` | `./data` | Blockchain data storage directory |

### Example: Production Multi-Node Cluster

Using Kubernetes or Docker Swarm, deploy multiple replicas:

```bash
# Docker Swarm example
docker service create \
  --name blockchain-node \
  --replicas 3 \
  --publish 3001:3001 \
  --publish 6001:6001 \
  -e NODE_ENV=production \
  blockchain-hometask:latest
```

Nodes will automatically discover and peer with each other via the P2P network.

---

## Monitoring & Health Checks

### Health Endpoint

Each node exposes a health check endpoint:
```bash
curl http://localhost:3001/health
```

Expected response (HTTP 200):
```json
{ "status": "ok", "timestamp": "2024-01-15T10:30:00Z" }
```

### Logs

#### Docker Compose
```bash
docker-compose logs -f blockchain-node-1
```

#### Docker Container
```bash
docker logs -f blockchain-node
```

#### Local Development
Output goes to stdout. Use a process manager like PM2 for production:
```bash
npm install -g pm2
pm2 start src/index.js --name blockchain-node
pm2 logs blockchain-node
pm2 monit
```

### Docker Compose Health Status
```bash
docker-compose ps
```

Look for the `STATUS` column — should show `Up (healthy)`.

---

## Data Persistence

### Local Directory
Blockchain state is stored in `./data/` directory (JSON files).

### Docker Volume
Persistent data is stored in Docker named volumes:
- `blockchain-data-1`: Node 1 state
- `blockchain-data-2`: Node 2 state

To backup blockchain state:
```bash
docker run --rm -v blockchain-data-1:/data -v $(pwd):/backup \
  alpine tar czf /backup/blockchain-backup.tar.gz -C /data .
```

To restore:
```bash
docker run --rm -v blockchain-data-1:/data -v $(pwd):/backup \
  alpine tar xzf /backup/blockchain-backup.tar.gz -C /data
```

---

## Networking

### Local Development (Docker Compose)
Nodes communicate via the `blockchain-network` bridge network. Service names resolve automatically:
- `blockchain-node-1:6001` for Node 1's P2P interface

### Production (Kubernetes)
Use Kubernetes Services for DNS discovery:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: blockchain-p2p
spec:
  selector:
    app: blockchain
  ports:
    - protocol: TCP
      port: 6001
      targetPort: 6001
  type: ClusterIP
```

Nodes can peer using: `ws://blockchain-p2p:6001`

---

## Scaling

### Horizontal Scaling Considerations

1. **State Synchronization**: P2P network automat­ically syncs the longest valid chain across all nodes.
2. **Data Consistency**: All nodes converge on the same canonical chain via PoW and validation rules.
3. **Mempool**: Each node maintains its own mempool; transactions are gossiped to peers.

### Load Balancing (API)

For API load balancing, use a reverse proxy:

```nginx
upstream blockchain_api {
  server localhost:3001;
  server localhost:3002;
  server localhost:3003;
}

server {
  listen 8080;
  location / {
    proxy_pass http://blockchain_api;
  }
}
```

---

## Troubleshooting

### Node Won't Start

Check logs:
```bash
docker-compose logs blockchain-node-1
```

Common issues:
- **Port already in use**: Change `ports` in docker-compose.yml or stop conflicting processes
- **Out of memory**: Increase Docker memory limits
- **Dependency failure**: Run `npm ci` and rebuild the image

### P2P Peers Not Connecting

1. Verify network connectivity:
   ```bash
   docker-compose exec blockchain-node-2 curl -i ws://blockchain-node-1:6001
   ```

2. Check logs for peer errors:
   ```bash
   docker-compose logs blockchain-node-1 | grep -i peer
   ```

3. Restart the node:
   ```bash
   docker-compose restart blockchain-node-1
   ```

### Chain Divergence

If nodes are on different chain branches:
1. Verify all nodes are running the same code version
2. Check P2P connectivity
3. Nodes should auto-sync to the longest valid chain. If not, investigate chain validation rules.

---

## CI/CD Pipeline

Automated testing and deployment:

1. **Push to GitHub**: Triggers GitHub Actions workflow
2. **Tests**: Runs on Node 18 and 20
3. **Docker Build**: Builds and caches Docker image
4. **Integration Test**: Tests in Docker Compose environment
5. **Optional**: Push to container registry (Docker Hub, ECR, etc.)

View pipeline status: https://github.com/your-org/BGA-hometask/actions

---

## Security Considerations

### Network
- P2P ports should only be accessible between trusted nodes
- Use VPN/private networks in production
- API port (3001) for external clients only if needed

### Data
- Encrypt blockchain data at rest if storing sensitive information
- Use strong permissions on data directories (mode 700)

### Container Security
- Run as non-root user (future: add `USER node` to Dockerfile)
- Use immutable base images (pin Node.js version)
- Regularly update dependencies: `npm audit fix`

---

## Support & Escalation

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review GitHub Issues
3. Contact the platform team

---

**Last Updated**: June 2024
**Maintainers**: DevOps Team
