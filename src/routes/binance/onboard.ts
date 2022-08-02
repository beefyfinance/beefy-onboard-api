import { getCountryFromIP } from "./ipService"
import { checkIpAddress, getData, getQuote } from "./service"
import { getCountryCurrency, getTQuote, getTransakData, isCountryAllowed } from "./transakService";

interface OnboardResponse {
    countryCode: string,
    currencyCode: string,
    providers: Record<string, any>
}

export const onboardStart = async (ipAddress: string) => {
    const start = Date.now();
    let countryCode = await getCountryFromIP(ipAddress);

    console.log(`> ${ipAddress} connecting from ${countryCode}`);

    let currencyCode = getCountryCurrency(countryCode);

    console.log(`> Default currency ${currencyCode}`);

    let resp: OnboardResponse = {
        countryCode,
        currencyCode,
        providers: {}
    };

    let checkBinanceIp = await checkIpAddress(ipAddress);
    console.log(`> Check binance IP test: ${checkBinanceIp}`)
    
    if (checkBinanceIp) { //Binance supported, add provider data
        let binanceData = getData();
        if (Object.keys(binanceData).length > 0) resp.providers.binance = binanceData;
    }

    if (isCountryAllowed(countryCode)) { //Transak supported, add provider data
        let transakData = getTransakData(countryCode);
        if (Object.keys(transakData).length > 0) resp.providers.transak = transakData;
    }

    const end = Date.now();
    console.log(`Onboard time: ${((end-start)/1000).toFixed(2)}s`)

    return resp;
}



export const getQuotes = async (providers: string[], network: string, cryptoCurrency: string, fiatCurrency: string, amountType: string, amount: number, countryCode: string) => {
    let response: any = {};
    if (providers.includes('transak')) {
        console.log('fetching transak');
        response.transak = await getTQuote(network, cryptoCurrency, fiatCurrency, amountType, amount, countryCode);
    }
    if (providers.includes('binance')) {
        console.log('fetching binance');
        response.binance = await getQuote(network, cryptoCurrency, fiatCurrency, amountType, amount);
    }

    return response;
}

export const getFake = async (providers: string[], network: string, cryptoCurrency: string, fiatCurrency: string, amountType: string, amount: number, countryCode: string) => {
    let response: any = {};
    if (providers.includes('transak')) {
        console.log('fetching transak');
        response.transak = await getTQuote("ETH", "ETH", "GBP", "fiat", 500, "GB");
    }
    if (providers.includes('binance')) {
        console.log('fetching binance');
        response.binance = await getQuote("BSC", "BUSD", "USD", "fiat", 500);
    }

    return response;
}