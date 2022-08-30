import axios, { AxiosRequestConfig } from 'axios';
import { pick } from 'lodash';
import { sign } from './protocol';

const BINANCE_URL = process.env.BINANCE_CONNECT_URL || 'https://sandbox.bifinitypay.com';

const productionBaseURL = 'https://www.binancecnt.com/en/pre-connect';

let providerOptions: ProviderOptions = {};

const allowedNetworks = new Set(['BSC', 'OPTIMISM', 'ARBITRUM', 'CELO', 'AVAX', 'FTM', 'MATIC', 'ONE', 'MOVR', 'GLMR', 'ROSE']);

const chainMapping: Record<string, string> = {
    'BSC': 'bsc',
    'OPTIMISM': 'optimism',
    'ARBITRUM': 'arbitrum',
    'CELO': 'celo',
    'AVAX': 'avax',
    'FTM': 'fantom',
    'MATIC': 'polygon',
    'ONE': 'harmony',
    'MOVR': 'moonriver',
    'GLMR': 'moonbeam',
    'ROSE': 'oasis'
}
interface CryptoNetworkResponse {
    cryptoCurrency: string,
    network: string,
    memoRequired: boolean,
    addressRegex: string,
    memoRegex: string,
    withdrawFee: number,
    withdrawMax: number,
    withdrawMin: number
}

interface CryptoNetworkResponse {
    cryptoCurrency: string,
    network: string,
    withdrawFee: number,
    withdrawMax: number,
    withdrawMin: number
}

interface CryptoTradePair {
    fiatCurrency: string,
    cryptoCurrency: string,
    paymentMethod: string,
    size: number,
    quotation: number,
    minLimit: number,
    maxLimit: number
}

const proxyInstance = axios.create({
    baseURL: BINANCE_URL,
    proxy: {
        protocol: 'http',
        port: 80,
        host: 'velodrome.usefixie.com',
        auth: {
            username: 'fixie',
            password: process.env.FIXIE_TOKEN || ""
        }
    }
});

export const getNetworkList = async () => {
    const ts = Date.now();
    try {
        const config = getHeaders("", ts);
        let response = await proxyInstance.get('/gateway-api/v1/public/open-api/connect/get-crypto-network-list', config);

        const networkList: CryptoNetworkResponse[] = response.data.data
            .map((resp: CryptoNetworkResponse) => pick(resp, "cryptoCurrency", "network", "withdrawMax", "withdrawMin", "withdrawFee"))
            .filter((resp: CryptoNetworkResponse) => allowedNetworks.has(resp.network));
        return networkList;
    } catch (error) {
        console.log((error as any).message);
        return [];
    }
}

export const getTradePairs = async () => {
    const ts = Date.now();
    try {
        const config = getHeaders("", ts);
        let response = await proxyInstance.get('/gateway-api/v1/public/open-api/connect/get-trade-pair-list', config);

        const cryptoTradePairs: CryptoTradePair[] = response.data.data;
        return cryptoTradePairs;
    } catch (error) {
        console.log(error);
        return [];
    }
}

export const checkIpAddress = async (ipAddress: string) => {
    const ts = Date.now();
    try {
        const body = {
            clientUserIp: ipAddress
        };
        const config = getHeaders(JSON.stringify(body), ts);
        let response = await proxyInstance.post('/gateway-api/v1/public/open-api/connect/check-ip-address', body, config);
        console.log(response.data)
        return response.data.data.status === 'pass';
    } catch (error) {
        console.log(error);
        return false;
    }
}

const getHeaders = (stringToSign: string, ts: number): AxiosRequestConfig => {
    const merchantSufix = `merchantCode=${process.env.MERCHANT_CODE}&timestamp=${ts}`
    const connector = stringToSign.length >= 1 ? "&" : "";
    const signature = sign(stringToSign + connector + merchantSufix);

    const config: AxiosRequestConfig = {
        headers: {
            "Content-Type": "application/json",
            "merchantCode": process.env.MERCHANT_CODE || "",
            "timestamp": ts,
            "x-api-signature": signature.toString("base64") || ""
        }
    }
    return config;
}

interface FiatCurrencyPayment {
    paymentMethod: string,
    minLimit: number,
    maxLimit: number
}

interface CryptoDetail {
    fiatCurrencies: {
        [fiatCurrency: string]: FiatCurrencyPayment[]
    },
    networks: string[]
}
interface ProviderOptions {
    [cryptoCurrency: string]: CryptoDetail
}

const normalizeNetworkName = (network: string) => {
    return chainMapping[network] ?? network;
}

const fetchData = async () => {
    console.log('> Initializing Binance Connect...');
    let start = Date.now();

    // Parallel ~0.42s
    let promises = [getNetworkList(), getTradePairs()];
    const results = await Promise.all(promises);
    const networkList = results[0] as CryptoNetworkResponse[];
    const pairList = results[1] as CryptoTradePair[];

    // Sequential ~0.85s
    // const pairList = await getTradePairs();
    // const networkList = await getNetworkList();

    pairList.forEach(pair => {
        if (!providerOptions.hasOwnProperty(pair.cryptoCurrency)) {
            providerOptions[pair.cryptoCurrency] = {
                fiatCurrencies: {},
                networks: []
            }
        }

        if (!providerOptions[pair.cryptoCurrency].fiatCurrencies.hasOwnProperty(pair.fiatCurrency)) {
            providerOptions[pair.cryptoCurrency].fiatCurrencies[pair.fiatCurrency] = [];
        }


        providerOptions[pair.cryptoCurrency].fiatCurrencies[pair.fiatCurrency].push({
            paymentMethod: pair.paymentMethod,
            minLimit: pair.minLimit,
            maxLimit: pair.maxLimit
        });
    })

    let allChains = new Set();
    networkList.forEach(network => {

        let networkName = normalizeNetworkName(network.network)
        allChains.add(networkName);
        if (!providerOptions.hasOwnProperty(network.cryptoCurrency)) {
            return console.log(`no crypto pair for network data for '${network.cryptoCurrency}'`);
        }

        // if (!providerOptions[network.cryptoCurrency].networks.hasOwnProperty(network.network)) {
        //     providerOptions[network.cryptoCurrency].networks[network.network] = [];
        // }

        providerOptions[network.cryptoCurrency].networks.push(networkName);
    })
    console.log('Binance chains')
    console.log(allChains)
    let end = Date.now();
    console.log('> Binance Connect initialized in ' + ((end - start) / 1000).toFixed(2) + 's');
}

interface Quote {
    quote: number,
    fee: number,
    paymentMethod: string
}

export const getQuote = async (network: string, cryptoCurrency: string, fiatCurrency: string, amountType: string, amount: number) => {
    const pairList = await getTradePairs();
    const networkList = await getNetworkList();
    let filtered = pairList.filter(pair => pair.fiatCurrency === fiatCurrency && pair.cryptoCurrency === cryptoCurrency);

    if (amountType === 'crypto') {
        filtered = filtered.filter(pair => {
            let cryptoAmount = amount / pair.quotation;
            return cryptoAmount >= (pair.minLimit ?? 0) && cryptoAmount <= (pair.maxLimit ?? Number.MAX_SAFE_INTEGER);
        })
    } else {
        filtered = filtered.filter(pair => amount >= (pair.minLimit ?? 0) && amount <= (pair.maxLimit ?? Number.MAX_SAFE_INTEGER));
    }

    let networkName: string = Object.entries(chainMapping).find(chain => chain[1] === network)?.[0] ?? "";

    console.log(networkName)
    let filteredNetwork = networkList.filter(networkElem => networkElem.network === networkName && networkElem.cryptoCurrency === cryptoCurrency);

    if (filteredNetwork.length === 0) {
        return [];
    }

    //Use this for real fees, not hardcoded ones
    // let networkData = filteredNetwork[0];

    let quotes: Quote[] = filtered.map(pair => {
        let fixedFee = amountType === 'fiat' ? amount * 0.02 : amount / pair.quotation * 0.02;
        return { quote: pair.quotation, fee: fixedFee, paymentMethod: pair.paymentMethod };
        // return { quote: pair.quotation, fee: networkData.withdrawFee, paymentMethod: pair.paymentMethod };
    });

    return quotes;
}

export const getData = () => {
    return providerOptions;
}

export const getBinanceConnectRedirect = (cryptoCurrency: string, fiatCurrency: string, network: string, amount: number, address: string) => {
    let ts = Date.now();
    let networkName: string = Object.entries(chainMapping).find(chain => chain[1] === network)?.[0] ?? "";
    const redirectURL = productionBaseURL + '?';
    const queryParams = (address ? `cryptoAddress=${address}&` : '') + `cryptoCurrency=${cryptoCurrency}&cryptoNetwork=${networkName}&fiatCurrency=${fiatCurrency}&merchantCode=${process.env.MERCHANT_CODE}&orderAmount=${amount}&timestamp=${ts}`
    const signature = sign(queryParams).toString('base64');
    return redirectURL + queryParams + `&signature=${signature}`;
}

fetchData();
