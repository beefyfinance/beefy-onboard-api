import axios from "axios";

const SUPPORTED_NETWORS = [
  "arbitrum_mainnet",
  "avalanche_mainnet",
  "bsc_mainnet",
  "fantom_mainnet",
  "mainnet",
  "matic_mainnet",
  "optimism_mainnet",
  "zksync_mainnet",
  "base_mainnet",
  "xdai_mainnet", //gnosis
];

const SUPPORTED_NETWORK_MAPPING: Record<string, string> = {
  arbitrum_mainnet: "arbitrum",
  avalanche_mainnet: "avax",
  bsc_mainnet: "bsc",
  fantom_mainnet: "fantom",
  mainnet: "ethereum",
  matic_mainnet: "polygon",
  optimism_mainnet: "optimism",
  zksync_mainnet: "zksync",
  base_mainnet: "base",
  xdai_mainnet: "gnosis",
};

const SUPPORTED_FIAT_CURRENCIES = new Set([
  "CHF",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "JPY",
  "NOK",
  "NZD",
  "SEK",
  "SGD",
  "USD",
  "ZAR",
]);

const BANK_ENABLED_FIAT_CURRENCIES = new Set([
  "CHF", "DKK", "EUR", "GBP", "HKD", "JPY", "NOK", "NZD", "SEK", "SGD", "USD", "ZAR"
])

//make an set with the following words agEUR, AVAX, BNB, BTC, BTCB, crvUSD, DAI, ETH, EURL, EURC, EUROe, EURS, EURT, FRAX, GHO, jCHF, jEUR, LUSD, MAI, MATIC, RBTC, RDOC, RIF, sat, tzBTC, USDC, USDC.e, USDRIF, USDT, WBTC, WETH, XCHF, XDAI, XTZ
const SUPPORTED_CRYPTO_CURRENCIES = new Set([
  "agEUR",
  "AVAX",
  "BNB",
  "BTC",
  "BTCB",
  "crvUSD",
  "DAI",
  "ETH",
  "EURL",
  "EURC",
  "EUROe",
  "EURS",
  "EURT",
  "FRAX",
  "GHO",
  "jCHF",
  "jEUR",
  "LUSD",
  "MAI",
  "MATIC",
  "RBTC",
  "RDOC",
  "RIF",
  "sat",
  "tzBTC",
  "USDC",
  "USDC.e",
  "USDRIF",
  "USDT",
  "WBTC",
  "WETH",
  "XCHF",
  "XDAI",
  "XTZ",
]);

const tokenToInteralIdMapping: Record<string, string> = {};

interface CryptoDetail {
  fiatCurrencies: {
    [fiatCurrency: string]: FiatCurrencyPayment[];
  };
  networks: string[];
}
interface FiatCurrencyPayment {
  paymentMethod: string;
  minLimit: number | null;
  maxLimit: number | null;
  supportingCountries?: string[];
}
interface ProviderOptions {
  [cryptoCurrency: string]: CryptoDetail;
}

const cryptoData: ProviderOptions = {};

const API_URL = "https://api.mtpelerin.com/";

const BANNED_COUNTRIES: Set<string> = new Set();

const initializeMtPellerinService = async () => {
  console.log("Initializing Mt Pelerin...");
  await loadBannedCountries();
  await loadTokens();
};

export const isCountryAllowedPellerin = (countryCode: string): boolean => {
  return !BANNED_COUNTRIES.has(countryCode.toLowerCase());
};

const loadBannedCountries = async () => {
  try {
    const bannedCountries = (await axios.get(API_URL + "countries/forbidden"))
      .data;
    bannedCountries.forEach((countryCode: string) =>
      BANNED_COUNTRIES.add(countryCode)
    );
    console.log("Mt Pelerin forbidden countries loaded...");
  } catch (err: any) {
    console.log("Failed to load Mt Pelerin forbidden countries " + err.message);
  }
};

const loadTokens = async () => {
  const tokens = (await axios.get(API_URL + "currencies/tokens")).data;
  for (const [id, token] of Object.entries(tokens) as any) {
    if (
      !token.network ||
      SUPPORTED_NETWORK_MAPPING[token.network] === undefined ||
      !SUPPORTED_CRYPTO_CURRENCIES.has(token.symbol)
    )
      continue;
    tokenToInteralIdMapping[token.symbol] = id;
    if (!cryptoData[token.symbol]) {
      cryptoData[token.symbol] = { fiatCurrencies: {}, networks: [] };
      SUPPORTED_FIAT_CURRENCIES.forEach((cur) => {
        cryptoData[token.symbol].fiatCurrencies[cur] = [
          {
            paymentMethod: "bank_transfer",
            minLimit: null,
            maxLimit: null,
          },
        ];
      });
    }
    cryptoData[token.symbol].networks.push(
      SUPPORTED_NETWORK_MAPPING[token.network]
    );
  }

  console.log("Mt Pelerin tokens loaded...");
};

export const getMtPelerinData = () => cryptoData;

export const getPQuote = async (
  network: string,
  cryptoCurrency: string,
  fiatCurrency: string,
  amount: number
) => {
  const internalId = tokenToInteralIdMapping[cryptoCurrency];
  if (!internalId) throw new Error("Token not supported");
  if (!SUPPORTED_FIAT_CURRENCIES.has(fiatCurrency))
    throw new Error("Fiat currency not supported");
  const reverseNetworkMapping = Object.fromEntries(
    Object.entries(SUPPORTED_NETWORK_MAPPING).map(([k, v]) => [v, k])
  )[network];
  if (!reverseNetworkMapping) throw new Error("Network not supported");
  const body = {
    sourceCurrency: fiatCurrency,
    sourceNetwork: "fiat",
    sourceAmount: amount,
    destCurrency: cryptoCurrency,
    destNetwork: reverseNetworkMapping,
    isCardPayment: BANK_ENABLED_FIAT_CURRENCIES.has(fiatCurrency) ? false : true,
  };
  try {
    console.log(JSON.stringify(body));

    const resp = await axios.post(
      "https://api.mtpelerin.com/currency_rates/convert",
      body
    );
    console.log(resp.data);
    return [
      {
        quote: amount / parseFloat(resp.data.destAmount),
        paymentMethod: BANK_ENABLED_FIAT_CURRENCIES.has(fiatCurrency) ? 'bank_transfer' : 'card',
        fee:
          parseFloat(resp.data.fees.networkFee || 0) +
          (parseFloat(resp.data.fees?.fixFee || 0) * amount / 100),
      },
    ];
  } catch (err: any) {
    console.log("Failed to fetch mt pelerin quote:" + err.message);
    // console.log(err)
    return [];
  }
};

export const getMtPellerinUrl = (
  cryptoCurrency: string,
  fiatCurrency: string,
  network: string,
  amount: number,
  address: string
) => {
  const reverseNetworkMapping = Object.fromEntries(
    Object.entries(SUPPORTED_NETWORK_MAPPING).map(([k, v]) => [v, k])
  )[network];
  if (!reverseNetworkMapping) throw new Error("Network not supported");
  const url = `https://widget.mtpelerin.com/?` +
    `type=web` +
    `&lang=en` +
    `&tab=buy` +
    `&mode=dark` +
    // `&pm=card` +
    `&bdc=${cryptoCurrency}` +
    `&bsc=${fiatCurrency}` +
    `&bsa=${amount}` +
    `&net=${reverseNetworkMapping}` +
    `&_ctkn=c72db4b7-aa60-418c-8d31-7577494afc31` + 
    `&rfr=beefy`;
  
  return BANK_ENABLED_FIAT_CURRENCIES.has(fiatCurrency) ? url : url + `&pm=card`;
};

initializeMtPellerinService();
