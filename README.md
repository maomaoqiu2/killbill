# DEMO：https://killbill.online



# Kill Bill Game 🎮⚔️

A blockchain-based game powered by Fully Homomorphic Encryption (FHE) where players attempt to defeat Bill through strategic attacks while keeping his health encrypted on-chain.

## Overview

Kill Bill Game demonstrates the power of FHE technology in blockchain gaming. Unlike traditional blockchain games where all data is transparent, this game keeps Bill's health **encrypted throughout gameplay**, ensuring true privacy and preventing cheating through on-chain data inspection.

## How It Works

### Game Rules

- **Objective**: Defeat Bill by reducing his health to zero or below
- **Initial Health**: Bill starts with 1000 HP (encrypted)
- **Attacks**: Each player gets exactly 3 attacks per game session
- **Damage Range**: Each attack deals random damage between 200-500 HP
- **Victory Condition**: If total damage ≥ 1000 HP, Bill is defeated

### Game Flow

```
1. Initialize Game → Bill spawns with encrypted 1000 HP
2. Attack (×3) → Deal random damage, health remains encrypted
3. Decrypt & Verify → Reveal final health and determine winner
4. Start New Game → Reset and play again
```

## Technical Features

### Fully Homomorphic Encryption (FHE)

The game leverages **Zama's FHEVM** to perform operations on encrypted data:

- **Encrypted State**: Bill's health (`euint32`) remains encrypted on-chain
- **Encrypted Operations**: Damage calculation uses `FHE.sub()` on encrypted values
- **Underflow Protection**: Smart contract prevents negative health using `FHE.select()`
- **Client-Side Decryption**: Only the player can decrypt Bill's final health

### Smart Contract Architecture

**Key Components:**

- `GameSession`: Stores encrypted health, attack count, and game state per player
- `initializeGame()`: Starts a new game with encrypted initial health
- `attackBill()`: Performs an attack with random damage (200-500)
- `verifyDefeat()`: Checks if Bill is defeated after all 3 attacks
- `getBillHealth()`: Returns encrypted health handle for decryption

**Security Features:**

- Underflow protection using `FHE.ge()` and `FHE.select()`
- Permission management with `FHE.allowThis()` and `FHE.allow()`
- Per-player game sessions preventing interference

## Tech Stack

- **Blockchain**: Ethereum-compatible networks (Sepolia testnet)
- **FHE Library**: Zama's FHEVM Solidity library
- **Frontend**: React + TypeScript + Tailwind CSS
- **Web3**: ethers.js v6
- **Encryption**: Client-side FHE decryption signatures

## Game Statistics

- **Total Defeats**: Global counter tracking how many times Bill has been defeated across all players
- **Transparent Attacks**: Number of attacks and total damage are public
- **Hidden Health**: Actual remaining health stays encrypted until verification

## Why FHE Matters

Traditional blockchain games expose all state data, making them vulnerable to:

- **Front-running**: Players can see pending transactions and react
- **Data Mining**: Analyzing on-chain data to gain unfair advantages
- **Predictable Outcomes**: All random values are visible before commitment

With FHE, Kill Bill Game ensures:

- ✅ **True Privacy**: Health remains secret during gameplay
- ✅ **Fair Play**: No peeking at encrypted values
- ✅ **Verifiable Results**: Cryptographic proof of outcomes
- ✅ **On-Chain Computation**: All logic runs on blockchain, not trusted servers

## Future Enhancements

- Multiple difficulty levels
- Power-ups and special attacks
- Multiplayer modes
- NFT integration for weapons/characters
- Leaderboards with encrypted scores

## Getting Started

```bash
# Install dependencies
npm install

# Deploy contract
npx hardhat deploy --network sepolia

# Start frontend
npm run dev
```

## Smart Contract Details

- **Network**: Sepolia Testnet
- **FHE Type**: euint32 (32-bit encrypted unsigned integer)
- **Gas Optimization**: Efficient FHE operations
- **Testing**: Comprehensive test coverage for all game scenarios

## License

MIT

## Acknowledgments

Built with [Zama's FHEVM](https://www.zama.ai/) - pioneering Fully Homomorphic Encryption for Ethereum.

---

**Play Now**: Experience the future of private blockchain gaming! 🎮🔒
