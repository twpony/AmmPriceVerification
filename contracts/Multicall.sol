//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;
pragma experimental ABIEncoderV2;
import "hardhat/console.sol";

interface IUniswapV2Factory {
    function allPairsLength() external view returns (uint256);

    function allPairs(uint256) external view returns (address);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );
}

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function decimals() external view returns (uint8);
}

interface IUniswapV2Router01 {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        );

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETHWithPermit(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountETH);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountB);

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}

interface IUniswapV2Router02 is IUniswapV2Router01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountETH);

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

contract Multicall {
    struct Call {
        address target;
        bytes callData;
    }
    struct Result {
        bool success;
        bytes returnData;
    }
    struct PairInfo {
        uint64 number;
        address token0;
        address token1;
        address pair;
        uint8 decimal0;
        uint8 decimal1;
        uint256 reserve0;
        uint256 reserve1;
    }

    struct PairInfoRouter {
        address token0;
        address token1;
        address pair;
        uint8 decimal0;
        uint8 decimal1;
    }

    struct PriceResult {
        address paddr;
        uint256 buyprice;
        uint256 sellprice;
    }

    struct ReserveType {
        uint256 reserve0;
        uint256 reserve1;
    }

    address constant Uv2FAddr = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant Uv2R02Addr = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    constructor() {}

    function getUv2PairInfoByIndexRange(uint256 _start, uint256 _stop)
        external
        view
        returns (PairInfo[] memory result)
    {
        uint256 _qty = _stop - _start;
        result = new PairInfo[](_qty);
        for (uint256 i = 0; i < _qty; i++) {
            IUniswapV2Pair _uniswapPair = IUniswapV2Pair(
                IUniswapV2Factory(Uv2FAddr).allPairs(_start + i)
            );
            result[i].number = uint64(_start + i);
            result[i].token0 = _uniswapPair.token0();
            result[i].token1 = _uniswapPair.token1();
            result[i].pair = address(_uniswapPair);
            result[i].decimal0 = IERC20(result[i].token0).decimals();
            result[i].decimal1 = IERC20(result[i].token1).decimals();
            (result[i].reserve0, result[i].reserve1, ) = _uniswapPair
                .getReserves();

        }
        return result;
    }

    function getUv2PairReserve(address[] memory pairaddrs)
        external
        view
        returns (ReserveType[] memory result)
    {
        uint256 _len = pairaddrs.length;
        result = new ReserveType[](_len);
        for (uint256 i = 0; i < _len; i++) {
            IUniswapV2Pair _uniswapPair = IUniswapV2Pair(pairaddrs[i]);
            (result[i].reserve0, result[i].reserve1, ) = _uniswapPair
                .getReserves();
        }
        return result;
    }

    function getPriceFromUv2Router(address[] memory pairaddrs)
        external
        view
        returns (PriceResult[] memory result)
    {
        IUniswapV2Router02 Uv2R02 = IUniswapV2Router02(Uv2R02Addr);
        uint256 index = pairaddrs.length;
        result = new PriceResult[](index);

        for (uint256 i = 0; i < index; i++) {
            IUniswapV2Pair _uniswapPair = IUniswapV2Pair(pairaddrs[i]);
            (uint256 t0Reserve, , ) = _uniswapPair.getReserves();
            address token0 = _uniswapPair.token0();
            address token1 = _uniswapPair.token1();
            uint8 t0decimal = IERC20(token0).decimals();
            uint256 tokenAsset = 10**t0decimal;
            result[i].paddr = pairaddrs[i];

            uint256[] memory price = new uint256[](2);
            address[] memory path = new address[](2);
            path[0] = token0;
            path[1] = token1;

            price = Uv2R02.getAmountsOut(tokenAsset, path);
            result[i].sellprice = price[1];

            if (t0Reserve >= tokenAsset) {
                path[0] = token1;
                path[1] = token0;
                price = Uv2R02.getAmountsIn(tokenAsset, path);
                result[i].buyprice = price[0];
            } else {
                result[i].buyprice = 0;
            }
        }
        return result;
    }

    function aggregate(Call[] memory calls)
        public
        returns (bytes[] memory returnData)
    {
        returnData = new bytes[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(
                calls[i].callData
            );
            require(success, "Multicall aggregate: call failed");
            returnData[i] = ret;
        }
        return returnData;
    }

    function blockAndAggregate(Call[] memory calls)
        public
        returns (
            uint256 blockNumber,
            bytes32 blockHash,
            Result[] memory returnData
        )
    {
        (blockNumber, blockHash, returnData) = tryBlockAndAggregate(
            true,
            calls
        );
    }

    function getBlockHash(uint256 blockNumber)
        public
        view
        returns (bytes32 blockHash)
    {
        blockHash = blockhash(blockNumber);
    }

    function getBlockNumber() public view returns (uint256 blockNumber) {
        blockNumber = block.number;
    }

    function getCurrentBlockCoinbase() public view returns (address coinbase) {
        coinbase = block.coinbase;
    }

    function getCurrentBlockDifficulty()
        public
        view
        returns (uint256 difficulty)
    {
        difficulty = block.difficulty;
    }

    function getCurrentBlockGasLimit() public view returns (uint256 gaslimit) {
        gaslimit = block.gaslimit;
    }

    function getCurrentBlockTimestamp()
        public
        view
        returns (uint256 timestamp)
    {
        timestamp = block.timestamp;
    }

    function getEthBalance(address addr) public view returns (uint256 balance) {
        balance = addr.balance;
    }

    function getLastBlockHash() public view returns (bytes32 blockHash) {
        blockHash = blockhash(block.number - 1);
    }

    function tryAggregate(bool requireSuccess, Call[] memory calls)
        public
        returns (Result[] memory returnData)
    {
        returnData = new Result[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(
                calls[i].callData
            );

            if (requireSuccess) {
                require(success, "Multicall2 aggregate: call failed");
            }

            returnData[i] = Result(success, ret);
        }
    }

    function tryBlockAndAggregate(bool requireSuccess, Call[] memory calls)
        public
        returns (
            uint256 blockNumber,
            bytes32 blockHash,
            Result[] memory returnData
        )
    {
        blockNumber = block.number;
        blockHash = blockhash(block.number);
        returnData = tryAggregate(requireSuccess, calls);
    }
}
