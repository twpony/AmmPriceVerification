# 使用方法

1. 创建.env文件，写入`ETHEREUM_RPC_URL`
2. `npm install`
3. `npx hardhat compile`
4. 对于UniswapV2 Price的测试，使用  `npx hardhat test --grep "UniswapV2 price"`


# UniswapV2价格机制

UniswapV2使用常量乘积函数管理流动性，先来解决两个实际会遇到的数学问题：

**1）在常量乘积函数下，如果用户存入Δx 个tokenA，可以兑换出多少个tokenB？**

**2）在常量乘积函数下，如果用户希望兑出Δx 个tokenA，则需要存入多少个tokenB？**

如果以tokenA作为基准，对于用户来说，**问题1相当于tokenA的卖出价，而问题2相当于tokenA的买入价**。

先从常识的角度出发下一个结论：和外汇交易一样，在相同的市场环境下，**卖出价≤买入价**，否则就是虚幻的永动机了。

假设用户存入Δx个tokenA，可以兑换出 Δy个tokenB。兑换前后tokenA和tokenB的数量均符合常量乘积函数

$$ x\times y = (x+\Delta x)(y-\Delta y)=K $$

UniswapV2会收取交易费率 ρ（0.3%）。交易费属于固定费率，每一笔交易都需要收取。交易费用属于前端收费，即收取Δx × ρ个tokenA作为费用。

问题1）已知当前pool的x和y，存入Δx，拟兑出 Δy，常量乘积函数如下：

$$ x\times y = (x+\Delta x-\rho \Delta x)(y-\Delta y)=K $$

则Δy为：

$$ \Delta y = y - \frac {x\times y} {(x+\Delta x-\rho \Delta x)} $$

$$ \Delta y =  \frac {y\times (\Delta x-\rho \Delta x)} {(x+\Delta x-\rho \Delta x)} $$

问题2）已知当前pool的x和y，希望兑出Δx，拟存入Δy，常量乘积函数如下：

$$ x\times y = (x-\Delta x)(y+\Delta y-\rho \Delta y)=K $$

则Δy为：

$$ \Delta y = \frac{y - \frac {x\times y} {(x-\Delta x)}}{\rho-1} $$

$$ \Delta y = \frac{y\times \Delta x} {(1-\rho) \times {(x-\Delta x)}} $$
