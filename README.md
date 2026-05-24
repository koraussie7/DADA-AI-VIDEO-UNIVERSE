# DADA AI Video Universe

**Decentralized Video Platform** — Hard fork of [BitTube](https://bittube.app) / [PeerTube](https://joinpeertube.org)

## Features

- 🎥 HLS + P2P Media Loader streaming (Novage)
- ⛓️ Minima blockchain node (every viewer = node)
- 🪙 DADA Coin rewards for watching
- 👛 Vultisig wallet integration
- 🎬 BitTorrent / HLS download engine (Snail)
- 💾 Airtime Premium Storage
- 🤖 DADA AI integration

## Architecture

```
dada-video-universe/
  client/          # Angular frontend (BitTube/PeerTube)
  server/          # Node.js backend
  minima/          # Minima blockchain node
  snail/           # Snail download engine (Java, submodule)
  p2p-media-loader/ # Novage P2P Media Loader (submodule)
  dada-ai/         # DADA AI integration
```

## Building

```bash
# Clone with submodules
git clone --recurse-submodules git@github.com:koraussie7/DADA-AI-VIDEO-UNIVERSE.git

# Install client dependencies
cd client && yarn install

# Build
yarn build
```

## License

AGPL-3.0

