import axios from 'axios';
import maxmind, { CountryResponse, Reader, Response } from 'maxmind';
var geolite2 = require('geolite2');

const countryIPCache: Record<string, string> = {};
let lookup: Reader<CountryResponse>;

const init = async() => {
  lookup = await maxmind.open<CountryResponse>(geolite2.paths.country);
}

init();
export const getCountryFromIP = async (ipAddress: string): Promise<string> => {
  if (countryIPCache.hasOwnProperty(ipAddress)) {
    let countryCode = countryIPCache[ipAddress];
    return countryCode === '_' || countryCode === '-' ? 'GB' : countryCode;
  }

  const url = `https://api.iplocation.net/?ip=${ipAddress}`;
  let countryCode = "_";
  try {
    const response = await axios.get(url).then(res => res.data);
    countryCode = response.country_code2;
    countryIPCache[ipAddress] = countryCode;
  } catch (error) {
    console.log(`> Error fetching ip data`);
  }
  return countryCode === '_' || countryCode === '-' ? 'GB' : countryCode;
}

export const getCountryFromIPMM = async (ipAddress: string) => {
  const response = lookup.get(ipAddress)
  
  return response === null ? 'GB' : (response.country?.iso_code ?? 'GB');
}