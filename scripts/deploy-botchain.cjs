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
  let deployMockToken = null; // will determine based on network if not specified

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      networkName = args[i + 1];
    }
    if (args[i] === '--no-mock') {
      deployMockToken = false;
    }
    if (args[i] === '--with-mock') {
      deployMockToken = true;
    }
  }

  // Default: true for testnet, false for mainnet
  if (deployMockToken === null) {
    deployMockToken = (networkName !== 'mainnet');
  }

  const netConfig = NETWORKS[networkName];
  if (!netConfig) {
    console.error(`Unknown network: ${networkName}. Choose 'testnet' or 'mainnet'.`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log(`🚀 BOT Chain Deployment — ${netConfig.name}`);
  console.log(`   RPC URL:    ${netConfig.rpc}`);
  console.log(`   Chain ID:   ${netConfig.chainId}`);
  console.log(`   Explorer:   ${netConfig.explorer}`);
  console.log('====================================================\n');

  const privateKey = process.env.BOTCHAIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: No private key found!');
    console.error('Please set BOTCHAIN_PRIVATE_KEY in your .env file.');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(netConfig.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

  console.log(`Deployer Balance: ${ethers.formatEther(balance)} BOT`);
  console.log(`Network Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

  if (balance === 0n) {
    console.error('\n❌ Insufficient gas funds!');
    console.error(`Please fund your deployer address (${wallet.address}) with BOT tokens.`);
    if (networkName === 'testnet') {
      console.error(`👉 Get testnet BOT at the faucet: https://faucet.botchain.ai/basic`);
    } else {
      console.error(`👉 Swap for native BOT tokens on B DEX: https://dex.botchain.ai/#/swap`);
    }
    process.exit(1);
  }

  // Estimated required gas (~1.5M gas)
  const estimatedGasCost = gasPrice * 1500000n;
  if (balance < estimatedGasCost) {
    console.warn(`⚠️ Warning: Balance (${ethers.formatEther(balance)} BOT) is lower than recommended buffer (${ethers.formatEther(estimatedGasCost)} BOT).`);
  }

  // Load compiled artifacts
  const buildDir = path.resolve(__dirname, '..', 'build');
  const custosArtifactPath = path.join(buildDir, 'Custos.json');
  const mockArtifactPath = path.join(buildDir, 'MockERC20.json');

  if (!fs.existsSync(custosArtifactPath)) {
    console.log('Artifacts not found. Compiling first...');
    require('./compile.cjs');
  }

  const custosArtifact = JSON.parse(fs.readFileSync(custosArtifactPath, 'utf8'));

  let mockTokenAddress = null;
  let mockTokenTxHash = null;

  if (deployMockToken) {
    console.log('\nDeploying MockERC20 test token...');
    const mockArtifact = JSON.parse(fs.readFileSync(mockArtifactPath, 'utf8'));
    const mockFactory = new ethers.ContractFactory(mockArtifact.abi, mockArtifact.bytecode, wallet);
    const mockContract = await mockFactory.deploy('Test USDC', 'tUSDC', 6);
    const deployTx = mockContract.deploymentTransaction();
    mockTokenTxHash = deployTx ? deployTx.hash : null;
    await mockContract.waitForDeployment();
    mockTokenAddress = await mockContract.getAddress();
    console.log(`✅ MockERC20 deployed at: ${mockTokenAddress}`);
    console.log(`   Explorer: ${netConfig.explorer}/address/${mockTokenAddress}`);
  }

  console.log('\nDeploying Custos Escrow contract...');
  const custosFactory = new ethers.ContractFactory(custosArtifact.abi, custosArtifact.bytecode, wallet);
  const custosContract = await custosFactory.deploy();
  const deployTx = custosContract.deploymentTransaction();
  const txHash = deployTx ? deployTx.hash : null;
  console.log(`Transaction broadcast! Tx Hash: ${txHash}`);
  console.log(`Waiting for block confirmation...`);

  await custosContract.waitForDeployment();
  const custosAddress = await custosContract.getAddress();
  const receipt = deployTx ? await deployTx.wait() : null;

  console.log(`\n🎉 Custos successfully deployed!`);
  console.log(`   Contract Address: ${custosAddress}`);
  console.log(`   Transaction Hash: ${txHash}`);
  console.log(`   Block Number:     ${receipt ? receipt.blockNumber : 'N/A'}`);
  console.log(`   Gas Used:         ${receipt ? receipt.gasUsed.toString() : 'N/A'}`);
  console.log(`   Explorer:         ${netConfig.explorer}/address/${custosAddress}`);

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
    transactionHash: txHash,
    blockNumber: receipt ? receipt.blockNumber : null,
    gasUsed: receipt ? receipt.gasUsed.toString() : null,
    mockTokenAddress: mockTokenAddress,
    mockTokenTxHash: mockTokenTxHash,
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
