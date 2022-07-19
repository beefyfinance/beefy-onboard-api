import axios, { AxiosRequestConfig } from 'axios';
import { sign } from './protocol';

const BINANCE_URL = process.env.BINANCE_CONNECT_URL || 'https://sandbox.bifinitypay.com';

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
        console.log(response.data);
    } catch (error) {
        console.log((error as any).message);
    }
    
}

export const getTradePairs = async () => {
    const ts = Date.now();
    try {
        const config = getHeaders("", ts);

        let response = await proxyInstance.get('/gateway-api/v1/public/open-api/connect/get-trade-pair-list', config);
        console.log(response.data);
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
