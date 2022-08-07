require("dotenv").config();
const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

const main = async () => {
  // getting the weth from the fork mainnet
  await getWeth();
  const { deployer: xyz } = await getNamedAccounts();
  console.log("developer", xyz);

  // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5

  const lendingPool = await getLendingPool(xyz);
  console.log(`LendingPool address ${lendingPool.address}`);

  /**
   * Deposit!
   */
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  // approve
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, xyz);
  console.log("Depositing...");
  // console.log("LendingPool\n",lendingPool.functions)
  await lendingPool.deposit(wethTokenAddress, AMOUNT, xyz, 0);
  console.log("Deposited!");

  // const tCeth = await lendingPool.getUserAccountData(xyz)
  // console.log("Total Collateral",`${tCeth["totalCollateralETH"]}`)
  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    xyz
  );

  const daiPrice = await getDaiPrice();
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());    // 95% of ETH can borrow
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );
  console.log(`Amount of DAI ${amountDaiToBorrowWei} in wei`);
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, xyz);
  await getBorrowUserData(lendingPool, xyz);
};

/**
 * Borrow DAI
 */
async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account
) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowWei,
    1,
    0,
    account
  );
  await borrowTx.wait(1);
  console.log("You have borrowed");
}

/**
 * availableBorrowsETH ?? What the conversion rate on DAI is ?
 * Getting the price of DAI in ETH
 */
async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log("The DAI/ETH price is", price.toString());
  return price;
}

/**
 * Borrow
 * How much we have borrowed ?
 * How much we have in collateral ?
 * How much we can borrow ?
 */
async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);
  return { availableBorrowsETH, totalDebtETH };
}

/**
 * Getting the pool Contract
 */
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

  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
