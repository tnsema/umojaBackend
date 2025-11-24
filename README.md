# 🌍 Umoja Backend — Developer Guide

Welcome to the official **Umoja Backend** — the engine that powers the digital cooperative & mutual banking platform.  
This backend is designed to be **modular**, **scalable**, **secure**, and **developer‑friendly**, enabling rapid feature development while ensuring strict financial correctness.

---

# 🚀 Overview

Umoja Backend is built on:

- **Node.js + Express**
- **MongoDB with Mongoose**
- **Modular services & controllers**
- **JWT Authentication**
- **Role-based access control (RBAC)**
- **Nginx reverse proxy**
- **PM2 process manager (production)**
- **File uploads (POP / attachments / documents)**
- **Wallet + Wallet Transaction Engine**
- **Notifications System (IN_APP / EMAIL / SMS / PUSH)**

This guide helps new developers onboard quickly and test all critical flows.

---

# 📦 Requirements

- **Node.js ≥ 18**
- **npm**
- **MongoDB 6+**
- **PM2** (prod)
- **Nginx** (prod)
- **Ubuntu 22.04 / 24.04** recommended

---

# ⚙️ Environment Setup

Create:

- `.env`
- `.env.development`

Example:

```
MONGO_URI=mongodb://umoja:StrongPassword123!@127.0.0.1:27017/umojadb
JWTNAME=Umoja
JWTSECRET=Umoja123&54*$mSr527sbeu
PORT=4000
UPLOAD_PATH=./uploads
FRONTURL=https://bank.umoja.cd
```

Run:

```
npm install
npm run development
```

API available at:

```
http://localhost:4000/api
```

---

# 🔐 Authentication (JWT)

All protected routes require:

```
Authorization: Umoja-{token}
```

### Login

**POST /api/login**

```
{
  "identifier": "0000000000",
  "password": "admin123"
}
```

Response:

```
{
  "authToken": "Umoja-xxxxx",
  "user": { "_id": "...", "roles": ["ADMIN"] }
}
```

---

# 🧬 Roles (Seed First!)

Before anything:

```
npm run seed:roles
```

Creates:

- ADMIN
- MEMBER
- CLIENT

These roles define access to all API operations.

---

# 👛 Wallets

Each user automatically gets **one wallet**.

```
{
  "_id": "...",
  "userId": "...",
  "balance": 0,
  "currency": "ZAR"
}
```

Functions:

- `getWalletByUserService(userId)`
- `depositToWalletService({ walletId, amount })`
- `withdrawFromWalletService({ walletId, amount })`

---

# 🏦 Deposits (POP Upload)

Deposits allow members to upload proof of payment (POP).  
Admin must **verify** before wallet is credited.

### ▶️ Create Deposit (User)

**POST /api/deposits**  
`multipart/form-data`

Fields:

| Field                   | Required | Notes                                            |
| ----------------------- | -------- | ------------------------------------------------ |
| amount                  | yes      | deposit amount                                   |
| pop                     | optional | JPG/PNG/PDF                                      |
| purpose                 | no       | WALLET_TOPUP / TRANSFER_FUNDING / LOAN / PROJECT |
| linkedEntity.entityType | no       | TRANSFER / LOAN / PROJECT                        |
| linkedEntity.entityId   | no       | ObjectId                                         |

### Response:

```
{
  "status": true,
  "message": "Deposit created",
  "data": { "depositId": "64xxxx" }
}
```

---

# ✔️ Verify Deposit (Admin)

**POST /api/deposits/:id/verify**

Auto‑triggers:

- mark deposit VERIFIED
- credit wallet
- create WalletTransaction
- send notification

Example response:

```
{
  "status": true,
  "message": "Deposit verified and wallet credited",
  "data": { "walletBalance": 1800 }
}
```

---

# 💳 Wallet Transactions

Every money movement is logged.

### Transaction Types

- DEPOSIT
- WITHDRAWAL
- TRANSFER_OUT / TRANSFER_IN
- CONTRIBUTION
- LOAN_DISBURSEMENT
- LOAN_REPAYMENT
- PROJECT_CONTRIB
- REFUND
- ADJUSTMENT

### Direction

- **DEBIT** (money leaves wallet)
- **CREDIT** (money enters wallet)

### Status

- PENDING
- CONFIRMED
- REJECTED

---

# 🔄 Creating Wallet Transactions

### Example: Transfer Money

(SENDER → RECEIVER)

1️⃣ Sender:

```
{
  "walletId": "w1",
  "amount": 150,
  "type": "TRANSFER_OUT",
  "direction": "DEBIT",
  "reference": "TX123",
  "counterpartyUserId": "receiverUserId"
}
```

2️⃣ System auto‑creates:

```
{
  "walletId": "w2",
  "amount": 150,
  "type": "TRANSFER_IN",
  "direction": "CREDIT"
}
```

3️⃣ Wallet balances updated  
4️⃣ Notification sent

---

# 🔔 Notifications System

Methods:

- IN_APP
- EMAIL
- SMS
- PUSH_NOTIFICATION

Categories:

- SYSTEM
- TRANSACTION
- SECURITY
- ACCOUNT
- REMINDER

Scopes:

- USER
- ROLE
- ALL_USERS

---

## ▶️ Create Notification (Admin)

```
POST /api/notifications
```

Example:

```
{
  "type": "TRANSACTION",
  "method": "IN_APP",
  "title": "Deposit Verified",
  "message": "Your deposit was credited.",
  "scope": "USER",
  "receiverId": "userid123"
}
```

---

# 📂 File Uploads

Files stored in:

```
/uploads/pop_1699238100000.jpg
```

Extensions preserved correctly.

---

# 🧪 Testing Scenarios

| Scenario            | Route                            |
| ------------------- | -------------------------------- |
| User login          | POST /api/login                  |
| Create deposit      | POST /api/deposits               |
| Verify deposit      | POST /api/deposits/:id/verify    |
| Wallet transfer     | POST /api/wallet-transactions    |
| Create notification | POST /api/notifications          |
| List notifications  | GET /api/notifications           |
| Mark read           | POST /api/notifications/:id/read |
| Test role access    | Use CLIENT token on ADMIN route  |

---

# 👨‍💻 Developer Notes

### Core money operations must update:

✔ Deposit  
✔ Wallet  
✔ WalletTransactions  
✔ Notifications

### `linkedEntity` connects deposits to:

- transfers
- loans
- project contributions
- membership upgrades
- general payments

---

# 🎉 END OF README

Welcome to the team — and happy shipping! 🚀

## Script to update data on the server

/home/prodeasy/deploy-umoja.sh
