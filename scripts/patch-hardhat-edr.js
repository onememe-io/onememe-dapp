// Fixes a hardhat 2.28.x <-> EDR field-name mismatch that silently drops `chains.hardforkHistory`
// overrides when forking chains without built-in history (e.g. BSC 56/97):
// hardhat sends `hardforks`, newer EDR expects `hardforkActivationOverrides`.
// Idempotent; wired as npm postinstall so the fix survives reinstalls.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "node_modules", "hardhat", "internal", "hardhat-network", "provider", "provider.js");

if (!fs.existsSync(file)) {
  console.log("[patch-hardhat-edr] provider.js not found, skipping");
  process.exit(0);
}

let src = fs.readFileSync(file, "utf8");

if (src.includes("hardforkActivationOverrides")) {
  console.log("[patch-hardhat-edr] already patched");
  process.exit(0);
}

const old = `            return {
                chainId: BigInt(chainId),
                name: "Unknown",
                hardforks: Array.from(hardforkConfig.hardforkHistory, ([hardfork, blockNumber]) => {
                    return {
                        condition: { blockNumber: BigInt(blockNumber) },
                        hardfork: (0, convertToEdr_1.ethereumsjsHardforkToEdrSpecId)((0, hardforks_1.getHardforkName)(hardfork)),
                    };
                }),
            };`;

const replacement = `            const _hf = Array.from(hardforkConfig.hardforkHistory, ([hardfork, blockNumber]) => {
                return {
                    condition: { blockNumber: BigInt(blockNumber) },
                    hardfork: (0, convertToEdr_1.ethereumsjsHardforkToEdrSpecId)((0, hardforks_1.getHardforkName)(hardfork)),
                };
            });
            return {
                chainId: BigInt(chainId),
                name: "Unknown",
                hardforks: _hf,
                // compat: newer EDR expects this field name (hardhat<->EDR mismatch fix)
                hardforkActivationOverrides: _hf,
            };`;

if (!src.includes(old)) {
  console.warn("[patch-hardhat-edr] pattern not found (hardhat version changed?) — please re-check");
  process.exit(0);
}

fs.writeFileSync(file, src.replace(old, replacement));
console.log("[patch-hardhat-edr] applied");
