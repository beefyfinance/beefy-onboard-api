import axios from 'axios';

export const getCountryFromIP = async (ipAddress: string): Promise<string> => {
    const url = `https://api.iplocation.net/?ip=${ipAddress}`;
    let countryCode = "_";
    try {
        const response = await axios.get(url).then(res => res.data);
        countryCode = response.country_code2;
    } catch (error) {
        console.log(`> Error fetching ip data`);
    }
    return countryCode;
}