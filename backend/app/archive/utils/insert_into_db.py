from app.database import SessionLocal
from app.models import Top100


db = SessionLocal()
# db.query(Top100).delete()
# db.commit()
# db.close()

coins = [
    ("bitcoin", "btc"),
    ("ethereum", "eth"),
    ("tether", "usdt"),
    ("binancecoin", "bnb"),
    ("ripple", "xrp"),
    ("solana", "sol"),
    ("usd-coin", "usdc"),
    ("lido-staked-ether", "steth"),
    ("tron", "trx"),
    ("dogecoin", "doge"),
    ("cardano", "ada"),
    ("wrapped-steth", "wsteth"),
    ("wrapped-bitcoin", "wbtc"),
    ("wrapped-beacon-eth", "wbeth"),
    ("figure-heloc", "figr_heloc"),
    ("chainlink", "link"),
    ("ethena-usde", "usde"),
    ("wrapped-eeth", "weeth"),
    ("stellar", "xlm"),
    ("hyperliquid", "hype"),
    ("bitcoin-cash", "bch"),
    ("sui", "sui"),
    ("usds", "usds"),
    ("binance-bridged-usdt-bnb-smart-chain", "bsc-usd"),
    ("avalanche-2", "avax"),
    ("weth", "weth"),
    ("leo-token", "leo"),
    ("coinbase-wrapped-btc", "cbbtc"),
    ("hedera-hashgraph", "hbar"),
    ("litecoin", "ltc"),
    ("shiba-inu", "shib"),
    ("whitebit", "wbt"),
    ("monero", "xmr"),
    ("mantle", "mnt"),
    ("toncoin", "ton"),
    ("cronos", "cro"),
    ("ethena-staked-usde", "susde"),
    ("polkadot", "dot"),
    ("dai", "dai"),
    ("zcash", "zec"),
    ("uniswap", "uni"),
    ("bittensor", "tao"),
    ("world-liberty-financial", "wlfi"),
    ("memecore", "m"),
    ("aave", "aave"),
    ("susds", "susds"),
    ("okb", "okb"),
    ("bitget-token", "bgb"),
    ("ethena", "ena"),
    ("pepe", "pepe"),
    ("near", "near"),
    ("blackrock-usd-institutional-digital-liquidity-fund", "buidl"),
    ("jito-staked-sol", "jitosol"),
    ("paypal-usd", "pyusd"),
    ("ethereum-classic", "etc"),
    ("ondo-finance", "ondo"),
    ("aptos", "apt"),
    ("algorand", "algo"),
    ("cosmos", "atom"),
    ("kaspa", "kas"),
    ("quant", "qnt"),
    ("pax-gold", "paxg"),
    ("flare", "flr"),
    ("render-token", "render"),
    ("kucoin-shares", "kcs"),
    ("vechain", "vet"),
    ("pudgy-penguins", "pengu"),
    ("arbitrum", "arb"),
    ("tether-gold", "xaut"),
    ("worldcoin-wld", "wld"),
    ("internet-computer", "icp"),
    ("pumpdotfun", "pump"),
    ("sky", "sky"),
    ("lombard-staked-btc", "lbtc"),
    ("renzo-restaked-eth", "ezeth"),
    ("sei-network", "sei"),
    ("official-trump", "trump"),
]

try:

    for cid, sym in coins:
        db.add(Top100(coin_id=cid, symbol=sym.upper()))
    db.commit()
    print(f"Inserted {len(coins)} Top100 entries successfully.")
finally:
    db.close()
