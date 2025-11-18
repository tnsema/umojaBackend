# Umoja Backend

Backend service for the Umoja platform.  
Built with Node.js and Express.  
Deployed on Ubuntu with Nginx reverse proxy and PM2.

## Features
- REST API built with Express.
- Modular routing and controllers.
- Centralized configuration.
- API served in production through Nginx at `/api`.

## Requirements
- Node.js LTS
- npm
- MongoDB or PostgreSQL (depending on your configuration)
- PM2 (for production)

## Environment Variables
Create `.env.development` or `.env.production`.

Example:
MONGO_URI=mongodb://umoja:StrongPassword123!@127.0.0.1:27017/umojadb
JWTNAME=Umoja
SECRETKEY=Umoja*26@7$%@
APIKEY=C7Q16AU6BMYD1DTPHHKH2QQ4XFDIKAGGV5
JWTSECRET=Umoja123&54*$mSr527sbeu
APISECRET=UmojaKsd2025@34!nsHuaniod
PORT=3491
FRONTURL=https://bank.umoja.
NODE_TWOFA_NAME=UMOJA 
NODE_TWOFA_QR_IMAGE=https://qrcode.tec-it.com/API/QRCode?data=
SERVER_URL=https://prod.easyonramp.co.za
apiUserId=be99f707-4997-43b8-9313-f1721e3d292b
sandboxUrl=https://sandbox-api.fireblocks.io
FIREBLOCKS_VAULT_ID=1
