# Base Bridge Explorer Tool

An explorer tool to look up information about cross-chain messages in [Base Bridge](https://github.com/base/bridge). Supports both testnet and mainnet.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Acquire an [Etherscan API Key](https://etherscan.io/apis)

3. Create a `.env.local` file from the example template

```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your API key

```env
ETHERSCAN_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_NETWORK=testnet
```

5. Run the app

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

6. Visit [localhost:3000](http://localhost:3000/) in your browser

## Features

- Explore cross-chain bridge transactions between Base and Solana
- Support for both mainnet and testnet networks
- Real-time transaction status tracking
- Detailed transaction information display
- User-friendly interface with proper error handling

## Supported Networks

- **Base Mainnet** and **Base Sepolia** (testnet)
- **Solana Mainnet** and **Solana Devnet** (testnet)
