require("dotenv").config();
const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

const main = async () => {
  // getting the weth from the fork mainnet
  await getWeth();
  const { deployer:xyz } = await getNamedAccounts();
  console.log("developer",xyz);

  // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPool = await getLendingPool(xyz);
  console.log(`LendingPool address ${lendingPool.address}`);

  /**
   * Deposit!
   */
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  // approve
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT)
  console.log("Depositing...")
  await lendingPool.deposit(wethTokenAddress, AMOUNT, xyz, 0)
  console.log("Deposited!")

};

async function getLendingPool(account) {
  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );

  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );

  const tx = await erc20Token.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log("Approved!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
