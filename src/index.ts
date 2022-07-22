import { ethers } from "ethers";
import { config } from "dotenv";

//Enable configuration files
config();

const addresses = {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', 
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    recipient: '0x3db7B2413ae63E7e2D1a462119787C3aa3c0459e'
}

//Get your wallet address mnemonic to sign off transactions
const mnemonic: any = process.env.MNEMONIC;

//Used Infura provider
const provider = new ethers.providers.WebSocketProvider(process.env.INFURA_WSS_URL!);
//Set our wallet
const wallet = ethers.Wallet.fromMnemonic(mnemonic);
//Create an account by connecting our wallet to our provider
const account = wallet.connect(provider);


const factory = new ethers.Contract(
    addresses.factory,
    ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
    account
);

const router = new ethers.Contract(
    addresses.router,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactTokenForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
    ], account
);

factory.on('PairCreated', async (token0, token1, pairAddress) => {
    console.log(`
    New Pair detected: 
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}`);

    let tokenIn, tokenOut;
    if(token0 === addresses.WETH){
        tokenIn = token0;
        tokenOut = token1;
    }

    if(token1 === addresses.WETH) {
        tokenIn = token1;
        tokenOut = token0;
    }

    if(typeof tokenIn === 'undefined'){
        return;
    }

    const decimalNumbers = 18;
    const amountIn = ethers.utils.parseUnits('0.01', decimalNumbers);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    //Need more explanation: 
    const amountOutMin = amounts[1].sub(amounts[1].div(10));

    console.log(`
    Buying new Token:
    tokenIn: ${amountIn.toString()} ${tokenIn} (WETH)
    tokenOut: ${amountOutMin.toString()} ${tokenOut}`);

    const tx = await router.swapExactTokensForTokens(
        amountIn, amountOutMin, [tokenIn, tokenOut], addresses.recipient,
        Date.now() + 1000 * 60 * 10 //10 mintues
    );

    const receipt = await tx.await();
    console.log('Transaction receipt');
    console.log(receipt);
});