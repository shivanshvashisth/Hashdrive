const { ethers } = require("hardhat");

async function main() {
  const FileRegistry = await ethers.getContractFactory("FileRegistry");
  const contract = await FileRegistry.deploy();

  await contract.waitForDeployment(); // ✅ this is new in Hardhat 2.17+

  const address = await contract.getAddress(); // ✅ gets deployed address

  console.log("✅ Contract deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
