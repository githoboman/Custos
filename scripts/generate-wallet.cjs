const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const wallet = ethers.Wallet.createRandom();

console.log('==================================================');
console.log('🎉 New EVM Wallet Generated for BOT Chain');
console.log('==================================================');
console.log(`Address:     ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey}`);
console.log(`Mnemonic:    ${wallet.mnemonic.phrase}`);
console.log('==================================================\n');

// Write to .env
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = `BOTCHAIN_PRIVATE_KEY=${wallet.privateKey}
BOTCHAIN_ADDRESS=${wallet.address}
`;

fs.writeFileSync(envPath, envContent);
console.log(`Saved private key and address to ${envPath}`);
