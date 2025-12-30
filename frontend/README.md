# 🎲 BetChain - Decentralized Betting Platform

A Web3 portfolio project demonstrating blockchain integration, smart contracts, and modern frontend development.

---

## 🚀 Features

- 🔗 MetaMask wallet integration  
- 📝 Create custom bets with 2–10 options  
- 💰 Place bets using Sepolia testnet ETH  
- 📊 Real-time bet distribution visualization  
- ⏰ Optional deadline system  
- 🎨 Modern UI with TailwindCSS  

---

## 🛠️ Technologies

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS  
- **Blockchain**: Solidity, Web3.js, Ethers.js  
- **Network**: Ethereum Sepolia Testnet  
- **State Management**: React Context API  

---

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/betChain.git
cd betChain

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your contract address to .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_CHAIN_ID=0xaa36a7

# Run development server
npm run dev
