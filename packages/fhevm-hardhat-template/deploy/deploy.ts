import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { postDeploy } from "../../postdeploy";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();
  const chainName = hre.network.name;
  const balance = await ethers.provider.getBalance(deployer);
  const balanceInEth = ethers.formatEther(balance);
  
  console.log("📋 Deployment Info:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`🌐 Network:        ${chainName}`);
  console.log(`🔗 Chain ID:       ${chainId}`);
  console.log(`👤 Deployer:       ${deployer}`);
  console.log(`💰 Balance:        ${balanceInEth} ETH`);
  console.log("─────────────────────────────────────────────────────────────\n");


  const contractName = "KillBillGame";
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

  console.log(`${contractName} contract address: ${deployed.address}`);
  console.log(`${contractName} chainId: ${chainId}`);
  console.log(`${contractName} chainName: ${chainName}`);



 
  // Generates:
  //  - <root>/packages/site/abi/FHECounterABI.ts
  //  - <root>/packages/site/abi/FHECounterAddresses.ts
  postDeploy(chainName, contractName);
};

export default func;

func.id = "deploy_KillBillGame"; // id required to prevent reexecution
func.tags = ["KillBillGame"];
