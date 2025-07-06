const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  const J832Protocol = await hre.ethers.getContractFactory("J832Protocol");
  const j832 = await J832Protocol.deploy();
  await j832.waitForDeployment();  

  console.log("J832Protocol deployed to:", await j832.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
