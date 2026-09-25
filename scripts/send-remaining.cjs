const { ethers } = require('ethers');
require('dotenv').config();

async function sweepNetwork(name, rpcUrl, targetAddress, privateKey) {
  console.log(`\n====================================================`);
  console.log(`Sweeping remaining BOT on ${name}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Recipient: ${targetAddress}`);
  console.log(`====================================================`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Current Balance: ${ethers.formatEther(balance)} BOT`);

  if (balance === 0n) {
    console.log(`Balance is 0. Nothing to sweep.`);
    return null;
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;

  if (balance <= gasCost) {
    console.log(`Balance (${ethers.formatEther(balance)} BOT) is insufficient to cover gas (${ethers.formatEther(gasCost)} BOT).`);
    return null;
  }

  const sendAmount = balance - gasCost;
  console.log(`Gas Cost:   ${ethers.formatEther(gasCost)} BOT`);
  console.log(`Sending:    ${ethers.formatEther(sendAmount)} BOT to ${targetAddress}...`);

  const tx = await wallet.sendTransaction({
    to: targetAddress,
    value: sendAmount,
    gasLimit: gasLimit,
    gasPrice: gasPrice
  });

  console.log(`Tx Broadcast! Tx Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block ${receipt.blockNumber}!`);
  return tx.hash;
}

async function main() {
  const targetAddress = '0x29284e93b68C84A40c89873e567B9e14B95247b7';
  const privateKey = process.env.BOTCHAIN_PRIVATE_KEY;

  if (!privateKey) {
    console.error('No private key found in .env');
    process.exit(1);
  }

  // 1. Sweep Mainnet BOT
  const mainnetTx = await sweepNetwork(
    'BOT Chain Mainnet',
    'https://rpc.botchain.ai',
    targetAddress,
    privateKey
  );
  if (mainnetTx) {
    console.log(`🔗 Mainnet Explorer: https://scan.botchain.ai/tx/${mainnetTx}`);
  }

  // 2. Sweep Testnet BOT
  const testnetTx = await sweepNetwork(
    'BOT Chain Testnet',
    'https://rpc.bohr.life',
    targetAddress,
    privateKey
  );
  if (testnetTx) {
    console.log(`🔗 Testnet Explorer: https://scan.bohr.life/tx/${testnetTx}`);
  }
}

main().catch(console.error);
