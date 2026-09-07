const axios = require("axios");

const PAYSTACK_URL = "https://api.paystack.co";

function getHeaders() {
    return {
        Authorization:
            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

        "Content-Type": "application/json"
    };
}


// ===============================
// GET BANKS
// ===============================

async function getBanks() {

    const response = await axios.get(
        `${PAYSTACK_URL}/bank`,
        {
            params: {
                country: "nigeria",
                currency: "NGN"
            },
            headers: getHeaders()
        }
    );

    return response.data.data;
}


// ===============================
// RESOLVE BANK ACCOUNT
// ===============================

async function resolveAccount(
    accountNumber,
    bankCode
) {

    const response = await axios.get(
        `${PAYSTACK_URL}/bank/resolve`,
        {
            params: {
                account_number: accountNumber,
                bank_code: bankCode
            },
            headers: getHeaders()
        }
    );

    return response.data.data;
}


// ===============================
// CREATE TRANSFER RECIPIENT
// ===============================

async function createTransferRecipient({
    name,
    accountNumber,
    bankCode
}) {

    const response = await axios.post(
        `${PAYSTACK_URL}/transferrecipient`,
        {
            type: "nuban",

            name,

            account_number:
                accountNumber,

            bank_code:
                bankCode,

            currency: "NGN"
        },
        {
            headers: getHeaders()
        }
    );

    return response.data.data;
}

// ===============================
// INITIATE BANK TRANSFER
// ===============================

async function initiateTransfer({
    amount,
    recipientCode,
    reference,
    reason
}) {

    const response =
        await axios.post(
            `${PAYSTACK_URL}/transfer`,

            {
                source: "balance",

                amount:
                    Math.round(amount * 100),

                recipient:
                    recipientCode,

                reference,

                reason:
                    reason ||
                    "Bet Lord withdrawal"
            },

            {
                headers:
                    getHeaders()
            }
        );

    return response.data.data;
}


module.exports = {
    getBanks,
    resolveAccount,
    createTransferRecipient,
    initiateTransfer
};