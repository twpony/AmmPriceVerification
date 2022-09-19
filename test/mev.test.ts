import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Uv3PoolAbi, Erc20Abi, QuoterAbi2 } from "./abi";
import * as _ from "lodash";

type PairTuple = [string, string, string, Number, Number];

type ReserveTuple = [BigNumber, BigNumber];

type PairPriceTuple = [...PairTuple, ...ReserveTuple];

type PriceType = {
  paddr: string;
  buyprice: BigNumber;
  sellprice: BigNumber;
};

async function readAndParseCSV(dir: string, data: any[]) {
  try {
    const csvFilePath = path.resolve(__dirname, dir);
    const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });
    const parser = parse({
      delimiter: ",",
    });

    parser.on("readable", function () {
      let record;
      while ((record = parser.read())) {
        data.push(record);
      }
    });

    parser.on("error", function (err) {
      console.error(err.message);
    });

    parser.on("end", function () {
      // console.log(data);
    });

    parser.write(fileContent);
    parser.end();
  } catch (error) {
    console.log("error", error);
  }
}

function getPairPrice(params: PairPriceTuple[]) {
  const index = params.length;
  const result: Array<PriceType> = [];

  for (let i = 0; i < index; i++) {
    const xDelta: BigNumber = BigNumber.from(10).pow(params[i][3].valueOf());
    const x = params[i][5];
    const y = params[i][6];

    const sellNumerator = y.mul(xDelta).mul(997);
    const sellDenominator = x.mul(1000).add(xDelta.mul(997));
    const sellPrice = sellNumerator.div(sellDenominator);

    let buyPrice = BigNumber.from(0);
    // reserve must be enough to cover swap out
    if (xDelta.lt(params[i][5])) {
      const buyNumerator = y.mul(xDelta);
      const buyDenominator = x.sub(xDelta).mul(997).div(1000);
      // to follow UV2Library to add 1
      buyPrice = buyNumerator.div(buyDenominator).add(1);
    }
    result[i] = {
      paddr: params[i][2],
      buyprice: buyPrice,
      sellprice: sellPrice,
    };
  }
  return result;
}

/**
 * verify b: 1. b can be larger than a; or 2. b can not be less than a by 99.99%
 * @param a the basic number
 * @param b the number needed to compare with a
 * @returns true, b meets the demand; false, b does not meet the demand.
 */
function VerifyValue(a: number, b: number) {
  const c: number = Math.abs(a - b);
  const diff: number = c / a;
  if (diff > 0.0001) {
    if (a > b) {
      console.log("the difference is %f....", diff);
    } else {
      console.log("the difference is %f....", -1 * diff);
    }

    return false;
  } else {
    return true;
  }
}

/**
 * To estimate V3 price
 * @param liquidity the present liquidity read from contract
 * @param sp the present price, read from contract
 * @param amoutT0 swap token0 amount
 * @param amoutT1 swap token1 amount
 * @param t0Ort1  0: Token0 in or out; 1: Token1 in or out.
 * @param inOrout 0: token in; 1: token out.
 */
function estPriceV3(
  liquidity: number,
  sp: number,
  amountT0: number,
  amountT1: number,
  t0Ort1: number,
  inOrout: number
) {
  let result: number = 0;
  if (t0Ort1 === 0 && inOrout === 0) {
    // js deal with big number will have some unexpected error
    // here to multiply 1 to get the correct result
    result = (liquidity * sp) / (liquidity * 1 + amountT0 * sp);
  } else if (t0Ort1 === 0 && inOrout === 1) {
    result = (liquidity * sp) / (liquidity * 1 - amountT0 * sp);
  }
  return result;
}

/**
 * to get the amount delta by price boundary
 * @param sa low border price
 * @param sb high border price
 * @param liquidity the present liquidity
 * @param t0Ort1 0: Token0 in or out; 1: Token1 in or out.
 * @param inOrout 0: token in; 1: token out.
 */
function getAmountDeltaV3(
  sqrtlower: number,
  sqrthigher: number,
  liquidity: number,
  t0Ort1: number,
  inOrout: number
) {
  let result: number = 0;
  if (sqrtlower > sqrthigher) {
    let temp: number = 0;
    temp = sqrthigher;
    sqrthigher = sqrtlower;
    sqrtlower = temp;
  }
  if (t0Ort1 === 1 && inOrout === 0) {
    // follow the core code
    result = liquidity * (sqrthigher * 1 - sqrtlower * 1) + 1;
  } else if (t0Ort1 === 1 && inOrout === 1) {
    result = liquidity * (sqrthigher * 1 - sqrtlower * 1);
  }
  return result;
}

function abs(a: BigNumber, b: BigNumber) {
  if (a.lt(b)) {
    return b.sub(a);
  } else {
    return a.sub(b);
  }
}

describe("UniswapV2Test", function () {
  it("Estimation of UniswapV2 price", async function () {
    const [owner] = await ethers.getSigners();
    const MulticallFactory = await ethers.getContractFactory("Multicall");
    const Uv2Multicall = await MulticallFactory.connect(owner).deploy();
    await Uv2Multicall.deployed();
    console.log("Uv2Multicall deployed...");

    const pairInfo: PairTuple[] = [];
    const pairAddr: string[] = [];
    await readAndParseCSV("../data/pair-check.csv", pairInfo);

    pairInfo.forEach((e) => {
      pairAddr.push(e[2]);
    });

    const updateReserve: Array<ReserveTuple> = await Uv2Multicall.connect(
      owner
    ).getUv2PairReserve(pairAddr);

    const updatePair: PairPriceTuple[] = [];
    pairInfo.forEach((e, i) => {
      updatePair.push([...e, ...updateReserve[i]]);
    });

    const pairPrice: Array<PriceType> = getPairPrice(updatePair);

    console.log("######### price estimation as follows #########");
    console.log(pairPrice);

    const pairPriceFromUv2: Array<PriceType> = await Uv2Multicall.connect(
      owner
    ).getPriceFromUv2Router(pairAddr);
    // console.log("######### Price from Uniswapv2..........");
    // console.log(pairPriceFromUv2);

    for (let i = 0; i < pairInfo.length; i++) {
      let diff = abs(pairPrice[i].buyprice, pairPriceFromUv2[i].buyprice);
      expect(diff.mul(1000000)).to.lte(pairPriceFromUv2[i].buyprice);
      diff = abs(pairPrice[i].sellprice, pairPriceFromUv2[i].sellprice);
      expect(diff.mul(1000000)).to.lte(pairPriceFromUv2[i].sellprice);
    }
  });
});

describe("UniswapV3Price", function () {
  it("Estimate V3 Price", async function () {
    const [owner] = await ethers.getSigners();
    const V3Pool = "0x4c83A7f819A5c37D64B4c5A2f8238Ea082fA1f4e";
    const tokenTotest = 10;
    const V3Quoter2 = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
    const V3PoolContract = await ethers.getContractAt(
      Uv3PoolAbi,
      V3Pool,
      owner
    );
    const V3QuoterContract = await ethers.getContractAt(
      QuoterAbi2,
      V3Quoter2,
      owner
    );
    const token0: string = await V3PoolContract.connect(owner).token0();
    const token1: string = await V3PoolContract.connect(owner).token1();
    const Token0Contract = await ethers.getContractAt(Erc20Abi, token0, owner);

    const tk0Decimal: number = await Token0Contract.connect(owner).decimals();
    const fee: number = await V3PoolContract.connect(owner).fee();

    const amoutT0: number = tokenTotest * Math.pow(10, tk0Decimal);
    const amountT0Bignumber: BigNumber = BigNumber.from(10).mul(
      BigNumber.from(tokenTotest).pow(tk0Decimal)
    );

    const MAX_FEE: number = Math.pow(10, 6);
    const amoutT0AfterFee: number = (amoutT0 * (MAX_FEE - fee)) / MAX_FEE;

    const liquidity: number = await V3PoolContract.connect(owner).liquidity();

    const slot0 = await V3PoolContract.connect(owner).slot0();
    const tickP: number = slot0.tick;
    const sqrtpriceP: number = Math.pow(Math.pow(1.0001, tickP), 0.5);

    const estPrice00 = estPriceV3(
      liquidity,
      sqrtpriceP,
      amoutT0AfterFee,
      0,
      0,
      0
    );

    const estPrice01 = estPriceV3(liquidity, sqrtpriceP, amoutT0, 0, 0, 1);

    console.log("The est price 00 is %s.............", estPrice00);
    console.log("The est price 01 is %s.............", estPrice01);

    const estToken1Out: number = getAmountDeltaV3(
      estPrice00,
      sqrtpriceP,
      liquidity,
      1,
      1
    );

    const estToken1In: number = getAmountDeltaV3(
      sqrtpriceP,
      estPrice01,
      liquidity,
      1,
      0
    );

    const estToken1InBeforeFee: number =
      (estToken1In * MAX_FEE) / (MAX_FEE - fee);

    console.log("===============================");
    console.log("===============================");

    console.log("Token 1 Out is %d", estToken1Out);
    console.log("Token 1 In is %d", estToken1InBeforeFee);
    const encoded00 = {
      tokenIn: token0,
      tokenOut: token1,
      fee: fee.toString(),
      amountIn: amountT0Bignumber,
      sqrtPriceLimitX96: "0",
    };
    const encoded01 = {
      tokenIn: token1,
      tokenOut: token0,
      amount: amountT0Bignumber,
      fee: fee.toString(),
      sqrtPriceLimitX96: "0",
    };

    const QuoterResult00 = await V3QuoterContract.connect(
      owner
    ).callStatic.quoteExactInputSingle(encoded00);
    const QuoterResult01 = await V3QuoterContract.connect(
      owner
    ).callStatic.quoteExactOutputSingle(encoded01);
    const amoutOutQuoter00 = Number(QuoterResult00.amountOut.toBigInt());
    const amoutOutQuoter01 = Number(QuoterResult01.amountIn.toBigInt());

    if (VerifyValue(estToken1Out, amoutOutQuoter00) === true) {
      console.log("Estimated value 00 is right...");
    } else {
      console.log("Estimated Value 00 is wrong...");
    }
    if (VerifyValue(estToken1InBeforeFee, amoutOutQuoter01) === true) {
      console.log("Estimated value 01 is right...");
    } else {
      console.log("Estimated Value 01 is wrong...");
    }
  });
});
