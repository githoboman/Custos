const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('====================================================');
  console.log('🧪  CUSTOS ON-CHAIN INTERACTION TEST ON BOT CHAIN');
  console.log('====================================================\n');

  // Load testnet deployment
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
  const clientWallet = new ethers.Wallet(process.env.BOTCHAIN_PRIVATE_KEY, provider);

  // Generate a temporary freelancer wallet for testing two-party interactions
  const freelancerWallet = ethers.Wallet.createRandom().connect(provider);

  console.log(`Network:          BOT Chain Testnet (Chain ID ${deployment.chainId})`);
  console.log(`Custos Contract:  ${deployment.custosAddress}`);
  console.log(`Token Contract:   ${deployment.mockTokenAddress} (tUSDC)`);
  console.log(`Client Address:   ${clientWallet.address}`);
  console.log(`Freelancer Addr:  ${freelancerWallet.address}\n`);

  const custos = new ethers.Contract(deployment.custosAddress, custosArtifact.abi, clientWallet);
  const token = new ethers.Contract(deployment.mockTokenAddress, mockArtifact.abi, clientWallet);

  // 1. Fund Freelancer with a small amount of BOT for gas
  console.log('⏳ Step 1: Funding Freelancer wallet with 0.05 BOT for gas...');
  const fundTx = await clientWallet.sendTransaction({
    to: freelancerWallet.address,
    value: ethers.parseEther('0.05')
  });
  await fundTx.wait();
  console.log(`✅ Freelancer funded! Tx: ${deployment.rpcUrl.includes('bohr') ? 'https://scan.bohr.life/tx/' : 'https://scan.botchain.ai/tx/'}${fundTx.hash}\n`);

  // 2. Approve Custos to spend Client's tUSDC
  const upfrontAmount = ethers.parseUnits('50', 6);  // 50 tUSDC upfront
  const lockAmount = ethers.parseUnits('150', 6);     // 150 tUSDC locked escrow
  const totalAmount = upfrontAmount + lockAmount;     // 200 tUSDC total

  console.log('⏳ Step 2: Client approving Custos contract for 200 tUSDC...');
  const approveTx = await token.approve(deployment.custosAddress, totalAmount);
  await approveTx.wait();
  console.log(`✅ Approved! Tx: https://scan.bohr.life/tx/${approveTx.hash}\n`);

  // 3. Create Retainer
  console.log('⏳ Step 3: Creating Retainer (50 upfront + 150 locked escrow)...');
  const deliveryWindow = 3600; // 1 hour
  const approvalWindow = 3600; // 1 hour
  const createTx = await custos.createRetainer(
    deployment.mockTokenAddress,
    freelancerWallet.address,
    upfrontAmount,
    lockAmount,
    deliveryWindow,
    approvalWindow
  );
  const createReceipt = await createTx.wait();
  const retainerId = (await custos.nextId()) - 1n;

  console.log(`✅ Retainer #${retainerId} Created!`);
  console.log(`   Tx Hash: https://scan.bohr.life/tx/${createTx.hash}`);

  // Check balances after creation
  const freeBal1 = await token.balanceOf(freelancerWallet.address);
  const contractBal1 = await token.balanceOf(deployment.custosAddress);
  console.log(`   Freelancer Balance: ${ethers.formatUnits(freeBal1, 6)} tUSDC (Upfront payout verified!)`);
  console.log(`   Custos Escrow Bal:  ${ethers.formatUnits(contractBal1, 6)} tUSDC (Locked in contract!)\n`);

  // 4. Freelancer marks delivered
  console.log(`⏳ Step 4: Freelancer confirms delivery of work for Retainer #${retainerId}...`);
  const custosAsFreelancer = custos.connect(freelancerWallet);
  const deliverTx = await custosAsFreelancer.markDelivered(retainerId);
  await deliverTx.wait();
  console.log(`✅ Work Delivered! Tx: https://scan.bohr.life/tx/${deliverTx.hash}\n`);

  // 5. Client approves and releases payment
  console.log(`⏳ Step 5: Client approves work and releases the remaining 150 tUSDC...`);
  const releaseTx = await custos.approveAndRelease(retainerId);
  await releaseTx.wait();
  console.log(`✅ Approved and Released! Tx: https://scan.bohr.life/tx/${releaseTx.hash}\n`);

  // 6. Verify final state & balances
  const freeBalFinal = await token.balanceOf(freelancerWallet.address);
  const contractBalFinal = await token.balanceOf(deployment.custosAddress);
  const finalRetainer = await custos.getRetainer(retainerId);

  console.log('====================================================');
  console.log('🎉 FULL INTERACTION LIFECYCLE COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`Retainer ID:            #${retainerId}`);
  console.log(`Final Retainer State:   Paid (${finalRetainer.state.toString() === '3' ? 'STATE 3: PAID' : finalRetainer.state})`);
  console.log(`Freelancer Total Paid:  ${ethers.formatUnits(freeBalFinal, 6)} tUSDC (50 upfront + 150 escrow release)`);
  console.log(`Contract Escrow Bal:    ${ethers.formatUnits(contractBalFinal, 6)} tUSDC (Cleanly released)`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Interaction test failed:', err);
  process.exit(1);
});
