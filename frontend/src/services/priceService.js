export async function getTokenPrice(tokenId = "ethereum") {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    
    const res = await fetch(url);
    const data = await res.json();

    return {
      price: data.market_data.current_price.usd,
      priceChange24h: data.market_data.price_change_percentage_24h
    };
  } catch (err) {
    console.error("Erro ao buscar preço:", err);
    return {
      price: null,
      priceChange24h: null
    };
  }
}
