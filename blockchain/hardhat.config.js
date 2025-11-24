require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hardhat Network (default, tidak perlu setup)
    hardhat: {
      chainId: 1337,
      // Hardhat akan otomatis generate accounts dengan balance
    },
    // Localhost network (untuk node yang berjalan terpisah)
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 1337,
      // Accounts akan di-generate otomatis oleh Hardhat node
    },
    // Polygon Amoy Testnet (untuk production/testing) - Mumbai sudah deprecated
    amoy: {
      url: process.env.BLOCKCHAIN_RPC_URL || 'https://rpc-amoy.polygon.technology',
      accounts: (() => {
        const pk = process.env.PRIVATE_KEY;
        // Validasi private key hanya jika ada (tidak perlu untuk compile)
        if (pk && pk !== 'your_private_key_from_metamask' && pk !== 'your_private_key_here_without_0x_prefix_min_64_chars') {
          if (pk.length < 64) {
            console.warn('⚠️  PRIVATE_KEY terlalu pendek! Harus minimal 64 karakter hex');
            return [];
          }
          if (pk.startsWith('0x')) {
            console.warn('⚠️  PRIVATE_KEY masih ada prefix 0x! Hapus 0x di depan');
            return [];
          }
          return [pk];
        }
        // Jika tidak ada private key, return empty array (bisa untuk compile, tapi tidak bisa deploy)
        return [];
      })(),
      chainId: 80002,
    },
    // Polygon Mumbai Testnet (deprecated, gunakan amoy)
    mumbai: {
      url: process.env.BLOCKCHAIN_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/demo',
      accounts: (() => {
        const pk = process.env.PRIVATE_KEY;
        if (pk && pk !== 'your_private_key_from_metamask' && pk !== 'your_private_key_here_without_0x_prefix_min_64_chars' && pk.length >= 64 && !pk.startsWith('0x')) {
          return [pk];
        }
        return [];
      })(),
      chainId: 80001,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

