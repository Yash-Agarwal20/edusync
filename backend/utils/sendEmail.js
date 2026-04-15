const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (to, subject, text) => {
  await emailApi.sendTransacEmail({
    sender: { email: "your@email.com" },
    to: [{ email: to }],
    subject: subject,
    textContent: text,
  });
};