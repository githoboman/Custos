const { ethers } = require('ethers');

async function testRpc(name, url, expectedChainId) {
  console.log(`\n🔍 Testing ${name} (${url})...`);
  try {
    const provider = new ethers.JsonRpcProvider(url);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const feeData = await provider.getFeeData();

    console.log(`  ✅ Connected successfully!`);
    console.log(`  Chain ID: ${network.chainId.toString()} (Expected: ${expectedChainId})`);
    console.log(`  Current Block Number: ${blockNumber}`);
    console.log(`  Gas Price: ${feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A'}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Failed to connect to ${name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('==================================================');
  console.log('BOT Chain Network Connectivity Check');
  console.log('==================================================');

  await testRpc('BOT Chain Testnet', 'https://rpc.bohr.life', 968);
  await testRpc('BOT Chain Mainnet', 'https://rpc.botchain.ai', 677);
}

main().catch(console.error);
