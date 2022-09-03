import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { reserverAbi, multicallAbi } from "./abi";
import * as _ from "lodash";

type PairInfoTuple = [
  BigNumber,
  string,
  string,
  string,
  Number,
  Number,
  BigNumber,
  BigNumber
];

type PairTuple = [string, string, string, Number, Number];

type ReserveTuple = [BigNumber, BigNumber];

type PairPriceTuple = [...PairTuple, ...ReserveTuple];

type PriceType = {
  paddr: string;
  buyprice: BigNumber;
  sellprice: BigNumber;
};

type CallData = {
  target: string;
  callData: string;
};

const Uv2Router02: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

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
