import { getCountryFromIP } from "./ipService"
import { checkIpAddress, getData } from "./service"

interface OnboardResponse {
    countryCode: string,
    defaultCurrency: string,
    binance: any,
    transak: any
}

export const onboardStart = async (ipAddress: string) => {
    let countryCode = await getCountryFromIP(ipAddress);

    let resp: OnboardResponse = {
        countryCode,
        defaultCurrency: '',
        binance: null,
        transak: null
    };
    let checkBinanceIp = await checkIpAddress(ipAddress);
    if (checkBinanceIp) {
        resp.binance = getData();
    }
}