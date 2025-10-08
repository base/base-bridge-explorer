# Setup Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Etherscan API Key

## Installation Steps

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd bridge-explorer
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Etherscan API key:
   ```env
   ETHERSCAN_API_KEY=your_actual_api_key_here
   NEXT_PUBLIC_NETWORK=testnet
   ```

3. **Get Etherscan API Key**
   - Visit [https://etherscan.io/apis](https://etherscan.io/apis)
   - Create an account and generate a free API key
   - Add the key to your `.env.local` file

4. **Run the application**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Troubleshooting

### Common Issues

1. **"Etherscan API key not configured" error**
   - Make sure you've created `.env.local` file
   - Verify your API key is correct
   - Don't use the placeholder value

2. **Transaction not found**
   - Verify the transaction hash format
   - Check if you're using the correct network (mainnet vs testnet)
   - Ensure the transaction is bridge-related

3. **Build errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version (requires 18+)

### Network Configuration

- **Testnet**: Uses Base Sepolia and Solana Devnet
- **Mainnet**: Uses Base Mainnet and Solana Mainnet

Set `NEXT_PUBLIC_NETWORK=mainnet` in `.env.local` to use mainnet by default.