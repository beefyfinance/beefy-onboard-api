import { getCountryFromIP } from "./ipService"
import { checkIpAddress, getData } from "./service"
import { getCountryCurrency, getTransakData, isCountryAllowed } from "./transakService";

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