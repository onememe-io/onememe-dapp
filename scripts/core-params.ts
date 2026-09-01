import { ethers } from "hardhat";

/**
 * Shared Core constructor-param builder. Single source of truth for every
 * script that constructs facets or the Core implementation, so all of them
 * carry the EXACT same immutables (fees, flags, dex addresses).
 */

export type DexAddresses = {
  WBNB: string;
  PANCAKE_V3_FACTORY: string;
  PANCAKE_V2_FACTORY: string;
  PANCAKE_V2_ROUTER: string;
  // PancakeSwap V3 periphery, used by the OneMemeVLP launcher.
  // Verified against the live chain by the fork rehearsal before any deploy.
  PANCAKE_V3_POSITION_MANAGER: string;
  PANCAKE_V3_SWAP_ROUTER: string;
};

export const ADDRESSES: Record<number, DexAddresses> = {
  // BSC Testnet (chainId 97)
  97: {
    WBNB: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    PANCAKE_V3_FACTORY: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    PANCAKE_V2_FACTORY: "0x6725F303b657a9451d8BA641348b6761A6CC7a17",
    PANCAKE_V2_ROUTER: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    PANCAKE_V3_POSITION_MANAGER: "0x427bF5b37357632377eCbEC9de3626C71A5396c1",
    PANCAKE_V3_SWAP_ROUTER: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  },
  // BSC Mainnet (chainId 56)
  56: {
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    PANCAKE_V3_FACTORY: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    PANCAKE_V2_FACTORY: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    PANCAKE_V2_ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    PANCAKE_V3_POSITION_MANAGER: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
    PANCAKE_V3_SWAP_ROUTER: "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
  },
};

// ── OneMemeVLP defaults ─────────────────────────────────────────────────────
// PLACEHOLDER PRODUCT PARAMETERS — review before mainnet.
export const VLP_DEFAULTS = {
  // Flat native launch fee, forwarded to the locker treasury
  creationFeeWei: 5_000_000_000_000_000n, // 0.005 BNB
  // Claimed LP fees are split by the locker itself: 70% creator (contract
  // constant) / 10% donation (default bps) / 20% treasury (the remainder),
  // so nothing needs configuring here.
  // 1% V3 fee tier and its tick spacing
  poolFee: 10000,
  tickSpacing: 200,
  // Launch preset: 1B supply, ~4.7e-9 WBNB starting price (tick aligned to 200)
  supply: 10n ** 27n,
  initialTick: -191800,
  graduationThreshold: 16n * 10n ** 18n, // display-only (vlpProgress)
  maxWalletBps: 200, // 2% of supply
  maxTxBps: 220, // must be maxWalletBps * 110 / 100
  restrictionBlocks: 100,
};

export const DEAD = "0x000000000000000000000000000000000000dEaD";

// Giggle Academy — default donation receiver (10% of every trade fee).
// Overridable per deploy via the DONATION_RECEIVER env var.
export const GIGGLE_ACADEMY = "0xC7f501D25Ea088aeFCa8B4b3ebD936aAe12bF4A4";

// Build the full CoreInitParams struct as an object keyed by Solidity field names.
export function buildParams(opts: {
  deployer: string;
  feeReceiver: string;
  dex: DexAddresses;
  v2Migrator: string;
  tokenImpl: string;
  taxTokenImpl: string;
  taxProcessorImpl: string;
  dividendImpl: string;
  // facet refs (only set on the final Core impl params)
  launcher?: string;
  taxLauncher?: string;
  trade?: string;
  lens?: string;
  tweak?: string;
  dexRouter?: string;
}) {
  return {
    launcher_: opts.launcher ?? ethers.ZeroAddress,
    taxLauncher_: opts.taxLauncher ?? ethers.ZeroAddress,
    trade_: opts.trade ?? ethers.ZeroAddress,
    dexRouter_: opts.dexRouter ?? ethers.ZeroAddress,
    pancakeV2Migrator_: opts.v2Migrator,
    tweak_: opts.tweak ?? ethers.ZeroAddress,
    // lens_ must be non-zero on the Core impl params (constructor check);
    // facet params use the deployer as a harmless placeholder.
    lens_: opts.lens ?? opts.deployer,
    tokenImplV2_: opts.tokenImpl,
    tokenImplTaxedV2_: opts.taxTokenImpl,
    taxProcessorImpl_: opts.taxProcessorImpl,
    dividendImpl_: opts.dividendImpl,
    feeReceiver_: opts.feeReceiver,
    // Trading fee — ONE 1% fee per trade, split on-chain:
    // 10% donation (Giggle Academy) / 45% creator / 45% platform
    buyFeeRate_: 100,
    sellFeeRate_: 100,
    liquidityFee_: 0, // migration fee REMOVED 2026-08-18 (was 100 = 1% of the reserve at curve→Pancake migration); the whole reserve now becomes LP
    weth_: opts.dex.WBNB,
    pancakeV3Factory_: opts.dex.PANCAKE_V3_FACTORY,
    pancakeV2Factory_: opts.dex.PANCAKE_V2_FACTORY,
    pancakeV2Router_: opts.dex.PANCAKE_V2_ROUTER,
    enableTaxOnBondingCurve_: false,
    enableSpammerBlocker_: true,
  };
}
