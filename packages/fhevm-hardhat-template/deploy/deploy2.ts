import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { postDeploy } from "../../postdeploy";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();
  const chainName = hre.network.name;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║          🎮 KILL BILL GAME - DEPLOYMENT                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Get deployer balance
  const deployerSigner = await ethers.getSigner(deployer);
  const balance = await ethers.provider.getBalance(deployer);
  const balanceInEth = ethers.formatEther(balance);

  console.log("📋 Deployment Info:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`🌐 Network:        ${chainName}`);
  console.log(`🔗 Chain ID:       ${chainId}`);
  console.log(`👤 Deployer:       ${deployer}`);
  console.log(`💰 Balance:        ${balanceInEth} ETH`);
  console.log("─────────────────────────────────────────────────────────────\n");

  // Check if deployer has sufficient balance
  if (balance === BigInt(0)) {
    console.log("⚠️  WARNING: Deployer has 0 balance!");
    console.log("   Please fund the deployer address before deployment.\n");
    return;
  }

  const contractName = "KillBillGame";
  
  console.log(`🚀 Deploying ${contractName}...\n`);

  const deployed = await deploy(contractName, {
    from: deployer,
    log: true,
  });

  console.log("\n✅ Deployment Complete!");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`📄 Contract Name:  ${contractName}`);
  console.log(`📍 Address:        ${deployed.address}`);
  console.log(`🔗 Chain ID:       ${chainId}`);
  console.log(`🌐 Network:        ${chainName}`);
  console.log(`🆕 New Deploy:     ${deployed.newlyDeployed ? "Yes" : "No (Already deployed)"}`);
  
  if (deployed.receipt) {
    console.log(`⛽ Gas Used:       ${deployed.receipt.gasUsed.toString()}`);
    console.log(`🧾 Tx Hash:        ${deployed.receipt.transactionHash}`);
  }
  
  console.log("─────────────────────────────────────────────────────────────\n");

  // Get updated balance after deployment
  const balanceAfter = await ethers.provider.getBalance(deployer);
  const balanceAfterInEth = ethers.formatEther(balanceAfter);
  const costInEth = ethers.formatEther(balance - balanceAfter);

  console.log("💸 Deployment Cost:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`💰 Balance Before: ${balanceInEth} ETH`);
  console.log(`💰 Balance After:  ${balanceAfterInEth} ETH`);
  console.log(`💸 Cost:           ${costInEth} ETH`);
  console.log("─────────────────────────────────────────────────────────────\n");

  // Generate ABI and address files
  console.log("📝 Generating ABI and address files...\n");
  
  // Generates:
  //  - <root>/packages/site/abi/KillBillGameABI.ts
  //  - <root>/packages/site/abi/KillBillGameAddresses.ts
  postDeploy(chainName, contractName);

  console.log("✅ ABI files generated successfully!\n");

  // Display game constants
  console.log("🎮 Game Configuration:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`💚 Initial Health: 1000 HP`);
  console.log(`⚔️  Min Damage:     100 HP`);
  console.log(`⚔️  Max Damage:     500 HP`);
  console.log(`🎯 Max Attacks:    3`);
  console.log("─────────────────────────────────────────────────────────────\n");

  console.log("🎉 KILL BILL GAME DEPLOYED SUCCESSFULLY!\n");
  
  console.log("📌 Next Steps:");
  console.log("1. Update KillBillGameAddresses.ts with the contract address");
  console.log("2. Verify the contract on block explorer (if on public network)");
  console.log("3. Start the frontend: npm run dev");
  console.log("4. Connect MetaMask and start playing!\n");

  // Display contract interaction commands
  console.log("📚 Useful Commands:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`npx hardhat verify --network ${chainName} ${deployed.address}`);
  console.log(`npx hardhat console --network ${chainName}`);
  console.log("─────────────────────────────────────────────────────────────\n");
};

export default func;

func.id = "deploy_KillBillGame"; // id required to prevent reexecution
func.tags = ["KillBillGame"];