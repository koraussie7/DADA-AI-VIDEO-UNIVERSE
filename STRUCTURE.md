# DADA Video Universe - Project Structure

```
dada-video-universe/
├── client/                 # Angular frontend (BitTube/PeerTube base)
│   ├── src/
│   │   ├── app/           # Angular components
│   │   └── assets/player/ # Video player (p2p-media-loader + HLS.js)
│   └── ...
├── server/                 # Node.js backend (PeerTube/BitTube API)
├── minima/                 # Minima blockchain node (submodule or copy)
│   ├── src/               # Java source
│   ├── mds/               # MiniDAPP scripts
│   └── resources/         # Configuration
├── snail/                  # Snail download engine (Java, submodule)
├── dada-ai/                # DADA AI integration
│   ├── src/               # Rust backend
│   ├── flutter_app/       # Flutter UI
│   └── scripts/           # Automation
├── config/                 # Node configuration
└── README.md
```

## Integration Plan

1. **Client**: p2p-media-loader (Novage) → replace @peertube/* wrapper
2. **Server**: Snail → BT/HLS download engine  
3. **Blockchain**: Minima → replace GPU mining (CryptoNight → Minima PoW)
4. **Rewards**: Airtime → DADA Coin + Vultisig wallet
5. **Viewer Node**: Each viewer runs a Minima light node
