import axios from 'axios';

const countryIPCache: Record<string, string> = {};

export const getCountryFromIP = async (ipAddress: string): Promise<string> => {
    if (countryIPCache.hasOwnProperty(ipAddress)) {
        console.log('returning from cache');
        return countryIPCache[ipAddress];
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
    return countryCode;
}