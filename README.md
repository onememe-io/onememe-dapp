# OneMeme

Deployment configuration and live contract addresses for [OneMeme](https://onememe.io), a token
launchpad built for and deployed on **BNB Smart Chain (BSC)**.

Tokens launch on a bonding curve priced entirely on chain and graduate into a **PancakeSwap V2**
pool, or open a **PancakeSwap V3** pool at launch with the liquidity position locked permanently.
Every contract listed below is live on **BNB Smart Chain mainnet (chain ID 56)**.

This repository holds the build and deployment configuration that targets BNB Smart Chain. The
Solidity sources are not published here.

## Technology Stack

- **Blockchain**: BNB Smart Chain (BSC), mainnet (56) and testnet (97)
- **DEX integration**: PancakeSwap V2 and V3 (factory, router, position manager)
- **Smart contracts**: Solidity `0.8.28`, `viaIR`, optimizer on, `cancun` EVM
- **Libraries**: OpenZeppelin Contracts 5.5.0, OpenZeppelin Upgradeable 5.5.0, Solady 0.1.26
- **Tooling**: Hardhat for build and deployment, Foundry for fuzz, invariant and BSC fork tests
- **App and indexer**: Next.js with wagmi and viem, plus a BSC event indexer

## Supported Networks

| Network | Chain ID | Status |
|---|---|---|
| BNB Smart Chain Mainnet | 56 | Live, all contracts deployed |
| BNB Smart Chain Testnet | 97 | Used for staging |

No other network is configured anywhere in this repository. `hardhat.config.ts` defines `bscMainnet`
(56) and `bscTestnet` (97) and nothing else, and `scripts/core-params.ts` carries PancakeSwap
addresses for exactly those two chains.

## Contract Addresses

BNB Smart Chain mainnet, chain ID 56. Explorer: `https://bscscan.com/address/<address>`.

| Contract | Address | What it does |
|---|---|---|
| Core | `0xbe53182f88a14787988afad499d7AD8a85793f64` | Bonding curve: creates tokens, prices every buy and sell, migrates to PancakeSwap. |
| VLP Launcher | `0x067721FC42B9338b0c4F219003BF8EccCba533Da` | Opens a PancakeSwap V3 pool at launch instead of a curve. |
| VLP Locker | `0x04ab0D4A6550C70e43227C4621Ddb7cc56a6370A` | Holds the locked V3 position and splits its fees 70 creator / 20 platform / 10 donation. |
| Stock Vault Factory | `0x9434Ca980Da00189c4b6B17a4c05a0cFa4Ba1Da3` | Tax vaults that buy a basket of tokenized stocks for holders. |
| Crypto Vault Factory | `0x22357B7600A695BE763e60e018377ED6c8B8Ef45` | Tax vaults that buy a basket of major crypto assets. |
| Donation Vault Factory | `0x57e44B8fF5F473c2EdC0db4AF57899ABD0780c5e` | Tax vaults that give the revenue away to allow listed causes. |
| Sale Factory | `0x057117Dcea784f983F9F075DdAf623cFE02b3b0D` | Creates every presale, fair launch and subscription pool. |
| OneLock | `0x12a50b9E615083685529ed62e37CD2C168b49DB1` | Liquidity and team token locker. Locked positions have no withdrawal path. |

The full record, including the Core implementation, its six facets, the token implementations and
every vault beacon, is in [`deployments/bscMainnet.json`](deployments/bscMainnet.json).

PancakeSwap contracts the Core is wired to on chain 56:

| | |
|---|---|
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| PancakeSwap V2 Factory | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` |
| PancakeSwap V2 Router | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| PancakeSwap V3 Factory | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` |
| PancakeSwap V3 Position Manager | `0x46A15B0b27311cedF172AB29E4f4766fbE7F4364` |

## Features

- **Bonding curve launches on BSC.** Price is a pure function of supply, so a token trades from its
  first block with no liquidity pool and no order book. When the curve fills, the whole raised
  reserve becomes PancakeSwap V2 liquidity. Graduation itself takes no fee.
- **Selectable graduation targets.** A creator picks how much BNB the curve must raise before it
  migrates, from a small starter tier up to deep curves, each with its own reserve parameters.
- **Direct V3 pool launches.** An alternative path that opens a PancakeSwap V3 position at launch.
  The position is locked permanently and the creator keeps the pool fees it earns, split
  70 creator / 20 platform / 10 donation by the locker itself.
- **One trading fee, split on chain.** Curve trades pay 1%, divided in the same transaction:
  45% creator, 45% platform, 10% to Giggle Academy at
  `0xC7f501D25Ea088aeFCa8B4b3ebD936aAe12bF4A4`.
- **Non native quote assets.** A curve can be denominated in BNB or in an allow listed BEP-20:
  stablecoins (USDT, USDC, USD1), majors (BTCB, ASTER) and tokenized real world assets. The Core
  stores a PancakeSwap route per quote asset so a buyer can still pay in BNB.
- **Tax tokens with capped rates.** Optional buy and sell tax, capped at 10% on chain, with
  reflection and dividend accounting handled by dedicated implementations.
- **Tax vaults.** Instead of a marketing wallet, a tax token can point its revenue at a vault that
  buys a basket of tokenized stocks or crypto for holders, or donates it to an allow listed cause.

## Repository contents

```
hardhat.config.ts            BSC build and network configuration (chain 56 and 97 only)
scripts/core-params.ts       PancakeSwap addresses and Core constructor parameters per chain
scripts/patch-hardhat-*.js   BNB Smart Chain specific toolchain fixes, see below
deployments/bscMainnet.json  live chain 56 addresses
.env.example                 BSC RPC endpoints and deployer configuration
```

## BNB Smart Chain specific notes

Two toolchain fixes ship as npm `postinstall` steps because deploying to BSC does not work without
them:

- `scripts/patch-hardhat-ethers-to.js`. BSC nodes return `""` rather than `null` for the `to` field
  of a pending contract creation. `hardhat-ethers` passes that empty string to `getAddress()`, which
  throws `BAD_DATA`, so every deploy against BSC mainnet dies right after the first contract: the
  transaction succeeds on chain but the script crashes without recording the address.
- `scripts/patch-hardhat-edr.js`. Hardhat has no built in hardfork history for BSC, so forking
  chain 56 or 97 needs a `hardforkHistory` override. Hardhat 2.28.x sends that override under a
  field name newer EDR versions no longer read, and it is silently dropped.

`hardhat.config.ts` also declares `chains: { 56: ..., 97: ... }` with a `cancun` activation at block
zero, which is what lets fork tests run view calls against historical BSC state.

## Links

- Application: [onememe.io](https://onememe.io)
- Documentation and contract list: [onememe.io/docs](https://onememe.io/docs)
- User guide: [onememe.io/user-guide](https://onememe.io/user-guide)

## License

No repository wide license has been chosen yet.
