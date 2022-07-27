import axios from "axios"
import { pick } from "lodash";

const API_URL = (process.env.TRANSAK_API_URL || "https://staging-api.transak.com/") + "api/v2";

let currencyList: TransakFiatCurrency[] = [];

let cryptoData: CryptoData;
let fiatPayments: Record<string, FiatCurrencyPayment[]>;
let countries: Record<string, Country>;

interface Country {
    isAllowed: boolean,
    name: string,
    alpha2: string,
    alpha3: string,
    currencyCode: string
}

interface PaymentOption {
    id: string,
    minAmount: number,
    maxAmount: number,
    isActive: boolean
}

interface TransakFiatCurrency {
    symbol: string,
    supportingCountries: string[],
    isAllowed: boolean,
    minAmount: number,
    maxAmount: number,
    paymentOptions: PaymentOption[],
    currencyCode: string
}

interface TransakFiatCurrencyResponse {
    response: TransakFiatCurrency[]
}

interface TransakNetwork {
    name: string,
    fiatCurrenciesNotSupported: UnsupportedFiat[]
}

interface UnsupportedFiat {
    fiatCurrency: string,
    paymentMethod: string
}

interface TransakCryptoCurrency {
    symbol: string,
    uniqueId: string,
    network: TransakNetwork,
    isAllowed: boolean

}

interface TransakCryptoCurrencyResponse {
    response: TransakCryptoCurrency[]
}

interface TransakCountryResponse {
    isAllowed: boolean,
    name: string,
    alpha2: string,
    alpha3: string,
    currencyCode: string
}

export const getFiatCurrencies = async () => {
    try {
        let resp = await axios.get(API_URL + "/currencies/fiat-currencies");
        let currencyResponse: TransakFiatCurrencyResponse = resp.data;
        return currencyResponse.response.filter((fiatCurrency: TransakFiatCurrency) => fiatCurrency.isAllowed).map((fiatCurrency: TransakFiatCurrency) => pick(fiatCurrency, 'symbol', 'supportingCountries', 'paymentOptions', 'isAllowed', 'currencyCode'));
    } catch (error) {
        console.log('> Error fetching transak fiat currencies');
    }
}

export const getCryptoCurrencies = async () => {
    try {
        let resp = await axios.get(API_URL + "/currencies/crypto-currencies");
        let cryptoCurrencyResponse: TransakCryptoCurrencyResponse = resp.data;
        return cryptoCurrencyResponse.response.filter((cryptoCurrency: TransakCryptoCurrency) => cryptoCurrency.isAllowed).map((cryptoCurrency: TransakCryptoCurrency) => pick(cryptoCurrency, 'symbol', 'isAllowed', "network"))
    } catch (error) {
        console.log('> Error fetching transak fiat currencies');
    }
}

export const getCountries = async () => {
    try {
        let resp = await axios.get(API_URL + "/countries");
        let countryData: TransakCountryResponse[] = resp.data.response.map((country: TransakCountryResponse) => pick(country, "name", "alpha2", "alpha3", "currencyCode", "isAllowed"));
        return countryData;
    } catch (error) {
        console.log('> Error fetching transak fiat currencies');
    }
}

interface NetworkOffering {
    // withdrawFee: number,
    // withdrawMax: number,
    // withdrawMin: number,
    unsupportedPayments: UnsupportedFiat[]
}

interface FiatCurrencyPayment {
    paymentMethod: string,
    minLimit: number,
    maxLimit: number,
    supportingCountries?: string[]
}

interface CryptoDetail {
    fiatCurrencies: {
        [fiatCurrency: string]: FiatCurrencyPayment[]
    },
    networks: string[]
}

interface CryptoDetailNetwork {
    networks: {
        [network: string]: NetworkOffering[]
    }
}

interface ProviderOptions {

    [cryptoCurrency: string]: CryptoDetail,
}

interface CryptoData {
    [cryptoCurrency: string]: CryptoDetailNetwork
}

const normalizeNetworkName = (name: string): string => {
    const mapping: Record<string, string> = {
        "ethereum": "ETH",
        "mainnet": "BTC",
        "bsc": "BSC",
        "solana": "SOL",
        "fantom": "FTM",
        "celo": "CELO",
        "avaxcchain": "AVAX",
        "polygon": "MATIC",
        "arbitrum": "ARBI",
        "optimism": "OP",
        "moonriver": "MOVR"
    }
    return mapping[name] ?? name;
}

const fetchData = async () => {
    let start = Date.now();
    console.log('> Initializing Transak...');
    let countryData = await getCountries();

    countries = {};

    countryData?.forEach(country => {
        countries[country.alpha2] = {
            alpha2: country.alpha2,
            alpha3: country.alpha3,
            currencyCode: country.currencyCode,
            isAllowed: country.isAllowed,
            name: country.name
        }
    });

    // I can get crypto - network and not allowed payments
    let cryptoCurrencies = await getCryptoCurrencies();
    let fiatCurrencies = await getFiatCurrencies();

    cryptoData = {};

    fiatPayments = {};
    fiatCurrencies?.forEach(currency => {
        if (!fiatPayments.hasOwnProperty(currency.symbol)) {
            fiatPayments[currency.symbol] = [];
        }

        currency.paymentOptions.forEach(option => {
            fiatPayments[currency.symbol].push({
                paymentMethod: option.id,
                maxLimit: option.maxAmount,
                minLimit: option.minAmount,
                supportingCountries: currency.supportingCountries
            })
        })

    })


    const allChains = new Set();
    cryptoCurrencies?.forEach(currency => {
        if (!cryptoData.hasOwnProperty(currency.symbol)) {
            cryptoData[currency.symbol] = {
                networks: {}
            }
        }

        const networkName = normalizeNetworkName(currency.network.name);
        allChains.add(networkName)
        if (!cryptoData[currency.symbol].networks.hasOwnProperty(networkName)) {
            cryptoData[currency.symbol].networks[networkName] = [];
        }

        cryptoData[currency.symbol].networks[networkName].push({
            unsupportedPayments: currency.network.fiatCurrenciesNotSupported
        })
    })
    let end = Date.now();
    console.log('> Transak initialized in ' + ((end - start) / 1000).toFixed(2) + 's');
}


export const getTransakData = (countryCode: string) => {
    let supportedFiatInCountry: Record<string, FiatCurrencyPayment[]> = {};


    Object.keys(fiatPayments).forEach(currency => {
        let supportedList = fiatPayments[currency].filter(payment => payment.supportingCountries?.includes(countryCode));
        if (supportedList.length > 0) {
            supportedFiatInCountry[currency] = supportedList;
        }
    });
    let transakDataForCountry: ProviderOptions = {};


    Object.keys(cryptoData).forEach(cryptoCurrency => {
        const networks = cryptoData[cryptoCurrency].networks;
        const notSupported: UnsupportedFiat[] = [];


        transakDataForCountry[cryptoCurrency] = {
            fiatCurrencies: {},
            networks: []
        }


        Object.keys(cryptoData[cryptoCurrency].networks).forEach(network => {
            networks[network].forEach(networkDetail => {
                networkDetail.unsupportedPayments.forEach(notSupoprtedFiat => {
                    notSupported.push({
                        fiatCurrency: notSupoprtedFiat.fiatCurrency,
                        paymentMethod: notSupoprtedFiat.paymentMethod
                    })
                })
                transakDataForCountry[cryptoCurrency].networks.push(network)
            })
        })



        Object.keys(supportedFiatInCountry).forEach(currency => {
            let supported = supportedFiatInCountry[currency].filter(c => {
                return !notSupported.some(notSup => c.paymentMethod === notSup.paymentMethod && currency === notSup.fiatCurrency);
            }).map(payment => {
                let converted: FiatCurrencyPayment = {
                    minLimit: payment.minLimit,
                    maxLimit: payment.maxLimit,
                    paymentMethod: payment.paymentMethod
                }
                return converted;
            });
            if (supported.length === 0) {
                return delete transakDataForCountry[cryptoCurrency];
            }
            if (!transakDataForCountry[cryptoCurrency].fiatCurrencies.hasOwnProperty(currency)) {
                transakDataForCountry[cryptoCurrency].fiatCurrencies[currency] = supported;
            }
            // let currencyData = supportedFiatInCountry[currency];
            // transakDataForCountry[cryptoCurrency].fiatCurrencies[currency].push({
            //     a: currencyData.
            // })

        })

        Object.keys(transakDataForCountry).forEach(currency => {
            if (Object.keys(transakDataForCountry[currency].fiatCurrencies).length === 0) {
                delete transakDataForCountry[currency];
            }
        })

    })
    return transakDataForCountry;
}

export const getCountryCurrency = (countryCode: string) => {
    return countries[countryCode] ? countries[countryCode].currencyCode : 'USD';
}

export const isCountryAllowed = (countryCode: string) => {
    return countries[countryCode]?.isAllowed ?? false;
}

fetchData();

