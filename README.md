# Base Bridge Explorer Tool

An explorer tool to look up information about cross-chain messages in [Base Bridge](https://github.com/base/bridge). Supports both testnet and mainnet.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Acquire an [Etherscan API Key](https://etherscan.io/apis)

3. Create a `.env.local` file to store API key

```env
ETHERSCAN_API_KEY=<your api key>
```

4. Run the app

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Visit [localhost:3000](http://localhost:3000/) in your browser
