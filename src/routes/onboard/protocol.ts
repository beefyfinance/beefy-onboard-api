import { createSign, createVerify } from "crypto";

let privateKey: Buffer;
var publicKey: Buffer;

export const sign = (content: string) => {
    const signer = createSign("RSA-SHA256");
    signer.update(content);

    const signature = signer.sign({
        key: privateKey
    });

    return signature;
}

export const verifies = (signature: Buffer, contentToVerify: string) => {
    try {
        let verifier = createVerify("RSA-SHA256");
        verifier.update(contentToVerify);

        let verified = verifier.verify({
            key:publicKey
        }, signature)
        
        return verified;
    } catch (error) {
        console.log(error);
        return false;
    }

}

const loadKeys = () => {
    privateKey = Buffer.from(process.env.PRIVATE_BINANCE_KEY || "", "base64");
    publicKey = Buffer.from(process.env.PUBLIC_BINANCE_KEY || "", "base64");
}

loadKeys();