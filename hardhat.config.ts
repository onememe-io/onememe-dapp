import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
// bscTestnet uses its own key (falls back to PRIVATE_KEY if unset).
const TESTNET_PRIVATE_KEY = process.env.TESTNET_PRIVATE_KEY || PRIVATE_KEY;
const BSC_TESTNET_RPC =
  process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545";
const BSC_MAINNET_RPC =
  process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          // Mirror the original Foundry profile exactly
          optimizer: { enabled: true, runs: 99999 },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
    ],
    overrides: {
      // The launcher grew past the 24576-byte EIP-170 limit once dividend wiring was
      // added (viaIR + runs=99999 inlines _createTaxToken into every entrypoint).
      // Lower runs only for this facet to keep it deployable; creation gas is a
      // one-off cost per token so runtime impact is negligible.
      "contracts/facets/CoreLauncher.sol": {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
      "contracts/facets/CoreTaxLauncher.sol": {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
      // The VLP launcher embeds the full VLPToken creation code and, at
      // runs=99999, viaIR inlining pushes it far past EIP-170. Launches are
      // one-off gas, so low runs is the right trade-off here too.
      "contracts/vlp/VLPLauncher.sol": {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
          evmVersion: "cancun",
        },
      },
    },
  },
  networks: {
    // In-memory network. When FORK_RPC is set, fork that chain so a dry-run deploy
    // sees real PancakeSwap contracts (chainId is then taken from the forked chain).
    hardhat: process.env.FORK_RPC
      ? {
          forking: {
            url: process.env.FORK_RPC,
            // Without this a single hung provider request blocks the run forever
            // (the process sits at ~0% CPU waiting on a socket that never answers).
            timeout: 120_000,
            ...(process.env.FORK_BLOCK ? { blockNumber: Number(process.env.FORK_BLOCK) } : {}),
          },
          chainId: Number(process.env.FORK_CHAINID || 97),
          // BSC has no built-in hardfork history in hardhat; without this, view calls
          // at the historical fork block fail ("No known hardfork for execution").
          chains: {
            56: { hardforkHistory: { cancun: 0 } },
            97: { hardforkHistory: { cancun: 0 } },
          },
        }
      : process.env.FORK_CHAINID
        ? { chainId: Number(process.env.FORK_CHAINID) }
        : {},
    bscTestnet: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: TESTNET_PRIVATE_KEY ? [TESTNET_PRIVATE_KEY] : [],
    },
    bscMainnet: {
      url: BSC_MAINNET_RPC,
      chainId: 56,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Verification is OFF by default. Never verify without explicit approval.
  // Etherscan V2: a single Etherscan.io API key works across all chains (incl. BSC chainId 56).
  etherscan: {
    apiKey: BSCSCAN_API_KEY,
  },
};

export default config;
