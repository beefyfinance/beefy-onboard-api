import { getCountryFromIP } from "./ipService"
import { checkIpAddress, getData } from "./service"
import { getCountryCurrency, getTransakData, isCountryAllowed } from "./transakService";

interface OnboardResponse {
    countryCode: string,
    currencyCode: string,
    providers: Record<string, any>
}

export const onboardStart = async (ipAddress: string) => {
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
        // resp.providers.binance = getData();
    }

    if (isCountryAllowed(countryCode)) { //Transak supported, add provider data
        resp.providers.transak = getTransakData(countryCode);
    }

    return resp;
}