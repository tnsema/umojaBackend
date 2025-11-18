import dotenv from "dotenv";

// 🧭 Load base .env
dotenv.config();

// 🌍 Load environment-specific files if needed
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: ".env.development" });
}

const keyEnvBased = {
  mongoURI: process.env.MONGO_URI,
  port: process.env.PORT || 3491,
  jwtName: process.env.JWTNAME || "UmojaApp",
  secretKey: process.env.SECRETKEY,
  apiKey: process.env.APIKEY,
  frontUrl: process.env.FRONTURL,
  jwtSecret: process.env.JWTSECRET || "umojasecretkey",
  apiSecret: process.env.APISECRET,
  type: process.env.TYPE,
  NODE_TWOFA_NAME: process.env.NODE_TWOFA_NAME,
  NODE_TWOFA_QR_IMAGE: process.env.NODE_TWOFA_QR_IMAGE,
  bcryptSalt: 10,
  privateKey: process.env.PRIVATEKEY,
  SERVER_URL: process.env.SERVER_URL,
  AUTO_LOGOUT: 3600,
  twilioInfo: {
    from: "+16305900084",
    AuthToken: "50b0d3b5281087e33c288814a40a4ca6",
  },
  apiUserId: process.env.apiUserId,
  sandboxUrl: process.env.sandboxUrl || "https://www.docfoxapp.com/api/v2/",
  emailGateway: {
    fromMail: "help@easyonramp.co.za",
    nodemailer: {
      host: "mail.easyonramp.co.za",
      port: 465,
      secure: true,
      auth: {
        user: "help@easyonramp.co.za",
        pass: "Ask4Help!2025",
      },
    },
  },
  CLIENT_API_KEY:
    "Pp7lfJb2YATN3awW600IagazvW4DrKx6EvIaN0iXVv98BqRu3bNNNgPk8trpCr5c0SE",
  SECRETKEY: "15EF88AB-E557-4898-A079-1B7B8C3C3D60",
};

const key = { ...keyEnvBased };
export default key;
