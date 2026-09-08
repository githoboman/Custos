const fs = require('fs');
const path = require('path');
const solc = require('solc');

async function main() {
  console.log('Compiling contracts with solc...');
  const contractsDir = path.resolve(__dirname, '..', 'contracts');
  const buildDir = path.resolve(__dirname, '..', 'build');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const custosSource = fs.readFileSync(path.join(contractsDir, 'Custos.sol'), 'utf8');
  const mockSource = fs.readFileSync(path.join(contractsDir, 'MockERC20.sol'), 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'Custos.sol': { content: custosSource },
      'MockERC20.sol': { content: mockSource }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      if (error.severity === 'error') {
        console.error('ERROR:', error.formattedMessage);
        hasError = true;
      } else {
        console.warn('WARNING:', error.formattedMessage);
      }
    }
    if (hasError) process.exit(1);
  }

  // Save Custos artifact
  const custosContract = output.contracts['Custos.sol']['Custos'];
  fs.writeFileSync(
    path.join(buildDir, 'Custos.json'),
    JSON.stringify(
      {
        contractName: 'Custos',
        abi: custosContract.abi,
        bytecode: custosContract.evm.bytecode.object
      },
      null,
      2
    )
  );

  // Save MockERC20 artifact
  const mockContract = output.contracts['MockERC20.sol']['MockERC20'];
  fs.writeFileSync(
    path.join(buildDir, 'MockERC20.json'),
    JSON.stringify(
      {
        contractName: 'MockERC20',
        abi: mockContract.abi,
        bytecode: mockContract.evm.bytecode.object
      },
      null,
      2
    )
  );

  console.log('✅ Compilation successful! Artifacts written to /build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
