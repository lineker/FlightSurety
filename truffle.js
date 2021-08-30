var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    develop: {
      port: 8545,
      gas: 6721975,           // Gas sent with each transaction (default: ~6700000)
      gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
    },
  },
  compilers: {
    solc: {
      version: "^0.4.24",
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true, // Default: false
         runs: 1000 // Default: 200
       },
       evmVersion: "byzantium" // Default: "byzantium"
      }
    }
  }
}