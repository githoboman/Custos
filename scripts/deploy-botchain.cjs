const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const NETWORKS = {
  testnet: {
    name: 'BOT Chain Testnet',
    rpc: 'https://rpc.bohr.life',
    chainId: 968,
    explorer: 'https://scan.bohr.life'
  },
  mainnet: {
    name: 'BOT Chain Mainnet',
    rpc: 'https://rpc.botchain.ai',
    chainId: 677,
    explorer: 'https://scan.botchain.ai'
  }
};

async function main() {
  const args = process.argv.slice(2);
  let networkName = 'testnet';
  let deployMockToken = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      networkName = args[i + 1];
    }
    if (args[i] === '--no-mock') {
      deployMockToken = false;
    }
  }

  const netConfig = NETWORKS[networkName];
  if (!netConfig) {
    console.error(`Unknown network: ${networkName}. Choose 'testnet' or 'mainnet'.`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log(`🚀 Deploying Custos to ${netConfig.name}`);
  console.log(`   RPC URL:  ${netConfig.rpc}`);
  console.log(`   Chain ID: ${netConfig.chainId}`);
  console.log('====================================================\n');

  const privateKey = process.env.BOTCHAIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: No private key found!');
    console.error('Please set BOTCHAIN_PRIVATE_KEY or PRIVATE_KEY in your .env file or environment.');
    console.error('Example in .env:');
    console.error('  BOTCHAIN_PRIVATE_KEY=0xYourPrivateKeyHere\n');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(netConfig.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} BOT`);

  if (balance === 0n) {
    console.error('\n❌ Insufficient gas funds!');
    console.error(`Please fund your deployer address (${wallet.address}) with BOT tokens.`);
    if (networkName === 'testnet') {
      console.error(`👉 Get testnet BOT at the faucet: https://faucet.botchain.ai/basic`);
    } else {
      console.error(`👉 Swap for BOT tokens on B DEX: https://dex.botchain.ai/#/swap`);
    }
    process.exit(1);
  }

  // Load compiled artifacts
  const buildDir = path.resolve(__dirname, '..', 'build');
  const custosArtifactPath = path.join(buildDir, 'Custos.json');
  const mockArtifactPath = path.join(buildDir, 'MockERC20.json');

  if (!fs.existsSync(custosArtifactPath)) {
    console.error('Artifacts not found. Compiling first...');
    require('./compile.cjs');
  }

  const custosArtifact = JSON.parse(fs.readFileSync(custosArtifactPath, 'utf8'));

  let mockTokenAddress = null;
  if (deployMockToken) {
    console.log('\nDeploying MockERC20 test token (tUSDC)...');
    const mockArtifact = JSON.parse(fs.readFileSync(mockArtifactPath, 'utf8'));
    const mockFactory = new ethers.ContractFactory(mockArtifact.abi, mockArtifact.bytecode, wallet);
    const mockContract = await mockFactory.deploy('Test USDC', 'tUSDC', 6);
    await mockContract.waitForDeployment();
    mockTokenAddress = await mockContract.getAddress();
    console.log(`✅ MockERC20 deployed at: ${mockTokenAddress}`);
    console.log(`   Explorer: ${netConfig.explorer}/address/${mockTokenAddress}`);
  }

  console.log('\nDeploying Custos Escrow contract...');
  const custosFactory = new ethers.ContractFactory(custosArtifact.abi, custosArtifact.bytecode, wallet);
  const custosContract = await custosFactory.deploy();
  await custosContract.waitForDeployment();
  const custosAddress = await custosContract.getAddress();

  console.log(`\n🎉 Custos successfully deployed!`);
  console.log(`   Address:  ${custosAddress}`);
  console.log(`   Explorer: ${netConfig.explorer}/address/${custosAddress}`);

  // Save deployment info
  const deploymentsDir = path.resolve(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: networkName,
    chainId: netConfig.chainId,
    rpcUrl: netConfig.rpc,
    custosAddress: custosAddress,
    mockTokenAddress: mockTokenAddress,
    deployerAddress: wallet.address,
    deployedAt: new Date().toISOString()
  };

  const deploymentFilePath = path.join(deploymentsDir, `botchain-${networkName}.json`);
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment details saved to: ${deploymentFilePath}`);
}

main().catch((err) => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});
