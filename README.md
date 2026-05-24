# DADA AI Video Universe

**Decentralized P2P Blockchain Video Platform** — Hard fork of BitTube/PeerTube

## 🚀 Features

### 📺 Video Streaming
- **P2P Media Loader** — Novage p2p-media-loader with HLS.js
- **Cloudflare IPFS** — First video segment loaded via Cloudflare IPFS for zero-buffering
- **Snail Engine** — BT/HLS download engine (acgist/snail)

### ⛓️ Blockchain
- **Minima Node** — Every viewer runs a Minima light node
- **DADA Coin Rewards** — Watch videos, earn DADA Coin
- **Vultisig Wallet** — Secure wallet integration

### 🎯 Core Architecture
1. First video segment → Cloudflare IPFS (no buffering 🚀)
2. Subsequent segments → p2p-media-loader P2P network
3. Viewer = blockchain node → mining rewards
4. Airtime Premium Storage → DADA Coin payments

## 📦 Structure

```
dada-video-universe/
├── client/          # Angular frontend (BitTube/PeerTube)
├── server/          # Node.js API backend  
├── minima/          # Minima blockchain node (Java)
├── dada-ai/         # DADA AI integration (Rust + Flutter)
├── p2p-media-loader/ # Novage P2P Media Loader (submodule)
├── snail/           # Snail download engine (submodule, Java)
├── vendor/          # Vendored dependencies
└── config/          # Instance configuration
```

## 🛠️ Setup

```bash
git clone --recurse-submodules git@github.com:koraussie7/DADA-AI-VIDEO-UNIVERSE.git
cd client && yarn install && cd ..
cd server && yarn install && cd ..
# Build Minima
cd minima && ./gradlew build && cd ..
```

## 🤝 Contributing

DADA AI Video Universe — Open for collaboration.

## 📜 License

Based on PeerTube (AGPL-3.0) + BitTube modifications
