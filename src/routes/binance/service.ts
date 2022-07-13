import axios from 'axios';

const BINANCE_URL = process.env.BINANCE_CONNECT_URL || 'https://sandbox.bifinitypay.com';

export const getNetworkListWithProxy = async () => {
    
    try {
        const proxyInstance = axios.create({
            baseURL: BINANCE_URL,
            proxy: {
                port: 80,
                host: process.env.FIXIE_URL || 'localhost'
            }
        });
        let response = await proxyInstance.get('/gateway-api/v1/public/open-api/connect/get-crypto-network-list');
        console.log(response.data);
    } catch (error) {
        console.log(error);
    }
    
}

export const getNetworkList = async () => {
    console.log('fetching without proxy')
    try {
        const instance = axios.create({
            baseURL: BINANCE_URL
        });
        let response = await instance.get('/gateway-api/v1/public/open-api/connect/get-crypto-network-list');
        console.log(response.data);
    } catch (error) {
        console.log(error);
    }

}