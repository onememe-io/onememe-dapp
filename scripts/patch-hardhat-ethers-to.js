// hardhat-ethers cannot read a CONTRACT CREATION transaction whose `to` comes back as "" instead of null.
//
// After `signer.sendTransaction`, hardhat-ethers calls `checkTx` -> `getTransaction` ->
// `formatTransactionResponse`, which formats `to` with `allowNull(getAddress, null)`. `allowNull` only
// short-circuits on null/undefined, so an empty string falls through to `getAddress("")` and throws
// `BAD_DATA: invalid value for value.to`. BSC nodes return "" for the `to` of a pending contract
// creation, so EVERY deploy against BSC mainnet dies right after the first contract — the transaction
// succeeds on chain and the script still crashes, which is the worst possible combination: you pay for a
// contract, get no address recorded, and the deploy is left half-done.
//
// Patch: treat "" exactly like null in both `to` formatters (response + receipt). A contract creation is
// what "" means here, so null is the correct reading, not a workaround.
//
// Idempotent; wired as an npm postinstall so it survives reinstalls.
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname, "..", "node_modules", "@nomicfoundation", "hardhat-ethers", "internal", "ethers-utils.js"
);

if (!fs.existsSync(file)) {
  console.log("[patch-hardhat-ethers-to] ethers-utils.js not found, skipping");
  process.exit(0);
}

const NEEDLE = "to: allowNull(ethers_1.getAddress, null),";
const PATCHED = 'to: (v) => (v === null || v === undefined || v === "" ? null : (0, ethers_1.getAddress)(v)),';

let src = fs.readFileSync(file, "utf8");

if (src.includes(PATCHED)) {
  console.log("[patch-hardhat-ethers-to] already patched");
  process.exit(0);
}
if (!src.includes(NEEDLE)) {
  console.log("[patch-hardhat-ethers-to] target line not found — hardhat-ethers changed, patch NOT applied");
  process.exit(0);
}

const count = src.split(NEEDLE).length - 1;
src = src.split(NEEDLE).join(PATCHED);
fs.writeFileSync(file, src);
console.log(`[patch-hardhat-ethers-to] patched ${count} site(s) in ethers-utils.js`);
