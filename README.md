# 使用方法

1. 创建.env文件，写入`ETHEREUM_RPC_URL`
2. `npm install`
3. `npx hardhat compile`
4. 对于UniswapV2 Price的测试，使用  `npx hardhat test --grep "UniswapV2 price"`
5. 对于UniswapV3 Price的测试，使用  `npx hardhat test --grep "V3 price"`


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


# UniswapV3价格机制

相比V2，UniswapV3延续了常量乘积函数理念，但引入了集中流动性，即流动性提供者可以指定存入token对应的价格，存入token仅在价格区间内实现兑换，价格区间外无法兑换。集中流动性可以让LP提供的token更有效率地赚钱LP费用。
资产池中存在两种token，价格比例用 y/x = P 表示，资产池中的token仅在 Pₙ≤P≤Pₘ价格区间。
所以可以把常量乘积函数调整为如下形式，用来表示曲线EF：

$$
x\times y=K\quad\Rightarrow\quad (x+x_{m})\times(y+y_{n})=K
$$

价格区间 Pₙ≤P≤Pₘ，且xₙ和xₘ来自于N点和M点，所以可以推导出：

$$
(x+\frac{L}{\sqrt{P_{m}}})\times(y+L\sqrt{P_{n}})=L^{2} 
$$

$$
Δx=L(\frac{1}{\sqrt{P_t}}-\frac{1}{\sqrt{P}})  \\ \quad \\ Δy=L(\sqrt{P}-\sqrt{P_t}) 
$$

所以上面的公式很清楚的说明了，**在已知当前流动性L、当前价格P、拟兑换的价格Pt，如果需要存入Δx个token x，则可以根据公式（8）测算出兑换出的Δy。**这个结论有两个前提，1）拟兑换的价格Pt在当前价格区间内；2）当前价格区间的流动L完全可以满足兑付Δx。


上面的说明只摘抄了部分内容，详细公式推导可以参见Mirror。


