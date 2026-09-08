const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('Running on-chain sanity check against BOT Chain Testnet...');
  const deployment = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'deployments', 'botchain-testnet.json'), 'utf8')
  );
  const custosArtifact = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'build', 'Custos.json'), 'utf8')
  );
  const mockArtifact = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'build', 'MockERC20.json'), 'utf8')
  );

  const provider = new ethers.JsonRpcProvider(deployment.rpcUrl);
  const wallet = new ethers.Wallet(process.env.BOTCHAIN_PRIVATE_KEY, provider);

  const custos = new ethers.Contract(deployment.custosAddress, custosArtifact.abi, wallet);
  const mockToken = new ethers.Contract(deployment.mockTokenAddress, mockArtifact.abi, wallet);

  console.log(`Custos Address:     ${deployment.custosAddress}`);
  console.log(`MockToken Address:  ${deployment.mockTokenAddress}`);

  const nextId = await custos.nextId();
  console.log(`Initial nextId:     ${nextId.toString()}`);

  const tokenSymbol = await mockToken.symbol();
  const tokenDecimals = await mockToken.decimals();
  const balance = await mockToken.balanceOf(wallet.address);
  console.log(`Deployer Token Bal: ${ethers.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);

  console.log('✅ Deployed contracts are verified, live, and responsive on BOT Chain Testnet!');
}

main().catch(console.error);
