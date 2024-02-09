import { getCountryFromIPMM } from "./ipService"
import { getMtPelerinData, getMtPellerinUrl, getPQuote, isCountryAllowedPellerin } from "./mtpellerin/mtPellerinService";
import { getCountryCurrency, getTQuote, getTransakData, getTransakRedirectUrl, isCountryAllowed } from "./transak/transakService";

interface OnboardResponse {
  countryCode: string,
  currencyCode: string,
  providers: Record<string, any>
}

export const onboardStart = async (ipAddress: string) => {
  const start = Date.now();
  let countryCode = await getCountryFromIPMM(ipAddress);

  console.log(`> ${ipAddress} connecting from ${countryCode}`);

  let currencyCode = getCountryCurrency(countryCode);

  console.log(`> Default currency ${currencyCode}`);

  let resp: OnboardResponse = {
    countryCode,
    currencyCode,
    providers: {}
  };


  if (isCountryAllowed(countryCode)) { //Transak supported, add provider data
    let transakData = getTransakData(countryCode);
    if (Object.keys(transakData).length > 0) resp.providers.transak = transakData;
  }
  if (isCountryAllowedPellerin(countryCode)) {
    console.log("mtp country is allowed")
    let pelerinData = getMtPelerinData();
    if (Object.keys(pelerinData).length > 0) resp.providers.mtpelerin = pelerinData;
    console.log(resp.providers.mtpelerin)
  } else {
    console.log("country is not allowed")
  }

  const end = Date.now();
  console.log(`Onboard time: ${((end - start) / 1000).toFixed(2)}s`)

  return resp;
}



export const getQuotes = async (providers: string[], network: string, cryptoCurrency: string, fiatCurrency: string, amountType: string, amount: number, countryCode: string) => {
  let response: any = {};
  if (providers.includes('transak')) {
    console.log('fetching transak');
    response.transak = await getTQuote(network, cryptoCurrency, fiatCurrency, amountType, amount, countryCode);
  }
  if (providers.includes('mtpelerin')) {
    console.log('fetching mtpelerin');
    response.mtpelerin = await getPQuote(network, cryptoCurrency, fiatCurrency, amount);
  }

  return response;
}

export const getFake = async (providers: string[], network: string, cryptoCurrency: string, fiatCurrency: string, amountType: string, amount: number, countryCode: string) => {
  let response: any = {};
  if (providers.includes('transak')) {
    console.log('fetching transak');
    response.transak = await getTQuote("ETH", "ETH", "GBP", "fiat", 500, "GB");
  }

  return response;
}

export const getRedirect = (provider: string, network: string, cryptoCurrency: string, fiatCurrency: string, amountType: string, amount: number, address: string, paymentMethod: string) => {
  if (provider === 'transak') {
    return getTransakRedirectUrl(cryptoCurrency, fiatCurrency, network, paymentMethod, amountType, amount, address);
  } else if (provider === 'mtpelerin') {
    const redirect = getMtPellerinUrl(cryptoCurrency, fiatCurrency, network, amount, address);
    console.log(redirect)
    return redirect;
  }
}