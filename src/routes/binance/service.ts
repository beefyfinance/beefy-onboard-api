import axios, { AxiosRequestConfig } from 'axios';
import { pick } from 'lodash';
import { sign } from './protocol';

const BINANCE_URL = process.env.BINANCE_CONNECT_URL || 'https://sandbox.bifinitypay.com';

let providerOptions: ProviderOptions = {};

const allowedNetworks = new Set(['BSC', 'ETH']);
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

        return response.data.data.status === 'pass';
    } catch (error) {
        console.log(error);
    }
}

const getHeaders = (stringToSign: string, ts: number): AxiosRequestConfig => {
    const merchantSufix = `merchantCode=${process.env.MERCHANT_CODE}&timestamp=${ts}`
    const signature = sign(stringToSign + merchantSufix);

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

interface NetworkOffering {
    // withdrawMax: number,
    // withdrawMin: number
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
        allChains.add(network.network);
        if (!providerOptions.hasOwnProperty(network.cryptoCurrency)) {
            return console.log(`no crypto pair for network data for '${network.cryptoCurrency}'`);
        }

        // if (!providerOptions[network.cryptoCurrency].networks.hasOwnProperty(network.network)) {
        //     providerOptions[network.cryptoCurrency].networks[network.network] = [];
        // }

        providerOptions[network.cryptoCurrency].networks.push(network.network);
        // providerOptions[network.cryptoCurrency].networks[network.network].push({
        // withdrawMax: network.withdrawMax,
        // withdrawMin: network.withdrawMin
        // })
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

    if (amountType === 'fiat') {
        filtered = filtered.filter(pair => {
            let cryptoAmount = amount / pair.quotation;
            return cryptoAmount >= (pair.minLimit ?? 0) && cryptoAmount <= (pair.maxLimit ?? Number.MAX_SAFE_INTEGER);
        })
    } else {
        filtered = filtered.filter(pair => amount >= pair.minLimit && amount <= (pair.maxLimit ?? Number.MAX_SAFE_INTEGER));
    }

    let filteredNetwork = networkList.filter(networkElem => networkElem.network === network && networkElem.cryptoCurrency === cryptoCurrency);

    if (filteredNetwork.length === 0) return [];

    let networkData = filteredNetwork[0]

    let quotes: Quote[] = filtered.map(pair => {
        return { quote: pair.quotation, fee: networkData.withdrawFee, paymentMethod: pair.paymentMethod };
    });

    return quotes;

}

export const getData = () => {
    return providerOptions;
}

fetchData();
