const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('====================================================');
  console.log('🛡️  CUSTOS PROTOCOL — BOT CHAIN MAINNET READINESS CHECK');
  console.log('====================================================\n');

  const mainnetRpc = 'https://rpc.botchain.ai';
  const expectedChainId = 677;

  // 1. Check Artifacts
  const buildDir = path.resolve(__dirname, '..', 'build');
  const custosArtifactPath = path.join(buildDir, 'Custos.json');

  if (!fs.existsSync(custosArtifactPath)) {
    console.log('⏳ Compiling Custos.sol...');
    require('./compile.cjs');
  }

  const custosArtifact = JSON.parse(fs.readFileSync(custosArtifactPath, 'utf8'));
  console.log('✅ 1. Smart Contract Artifact: Ready');
  console.log(`      ABI Functions: ${custosArtifact.abi.filter((x) => x.type === 'function').length}`);
  console.log(`      Bytecode Size: ${(custosArtifact.bytecode.length / 2).toLocaleString()} bytes`);

  // 2. Test Mainnet RPC
  console.log('\n⏳ 2. Testing BOT Chain Mainnet RPC...');
  const provider = new ethers.JsonRpcProvider(mainnetRpc);

  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

    console.log('✅ 2. BOT Chain Mainnet RPC: Connected');
    console.log(`      Chain ID:     ${network.chainId.toString()} (Expected: ${expectedChainId})`);
    console.log(`      Latest Block: ${blockNumber.toLocaleString()}`);
    console.log(`      Gas Price:    ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // 3. Check Wallet
    console.log('\n⏳ 3. Checking Deployer Wallet Configuration...');
    const privateKey = process.env.BOTCHAIN_PRIVATE_KEY || process.env.PRIVATE_KEY;

    if (!privateKey) {
      console.log('❌ 3. Private Key: MISSING');
      console.log('      Set BOTCHAIN_PRIVATE_KEY in .env');
      return;
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('✅ 3. Deployer Wallet: Configured');
    console.log(`      Address:  ${wallet.address}`);
    console.log(`      Explorer: https://scan.botchain.ai/address/${wallet.address}`);

    // 4. Check Balance
    console.log('\n⏳ 4. Checking Mainnet Gas Balance...');
    const balance = await provider.getBalance(wallet.address);
    const balanceEther = ethers.formatEther(balance);
    console.log(`      Current Balance: ${balanceEther} BOT`);

    // Estimated deployment gas: ~1,250,000 gas @ gasPrice
    const estimatedGasUnits = 1250000n;
    const estimatedCostWei = estimatedGasUnits * gasPrice;
    const estimatedCostBOT = ethers.formatEther(estimatedCostWei);

    console.log(`      Estimated Deployment Cost: ~${estimatedCostBOT} BOT`);

    if (balance >= estimatedCostWei) {
      console.log('\n🎉 ALL CHECKS PASSED: READY FOR MAINNET DEPLOYMENT!');
      console.log('   Run: npm run deploy:botchain:mainnet\n');
    } else {
      console.log('\n⚠️  ACTION REQUIRED BEFORE DEPLOYMENT:');
      console.log(`   Wallet has ${balanceEther} BOT, but needs at least ~${estimatedCostBOT} BOT for gas.`);
      console.log(`   👉 Transfer ~0.1 to 1 BOT to: ${wallet.address}`);
      console.log(`   👉 Or bridge / swap on B DEX: https://dex.botchain.ai/#/swap\n`);
    }
  } catch (err) {
    console.error('❌ Failed to connect to BOT Chain Mainnet:', err.message);
  }
}

main().catch(console.error);
