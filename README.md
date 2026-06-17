# Stellar Nexus Swap

This project demonstrates the creation of a custom asset (`Nexus`) on the Stellar testnet, setting up a liquidity pool, performing a swap, and withdrawing funds from the pool.

---

## 🛠️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/Stellar-Grants/Stellar-Swap.git
cd Stellar-Swap
```

### 2. Install Server Dependencies
Ensure Node.js is installed, then run:
```bash
npm install
```

### 3. Run Backend Scripts
Execute the script to perform the transactions:
```bash
node server/index.js
```

### 4. Run Frontend
To start the web interface, execute the following commands:
```bash
cd client
npm install
npm run dev
```

---

## ⚙️ Implementation Details

- **DeFi Provider Public Key**: `GDTLOF5Q5EKPNMZWXOHSV6WHISWVDH535XUWFJGWIOQRXGWZJEGCE4LQ`
*(This account is used to issue the custom asset and provide liquidity.)*

### Custom Asset
- **Asset Name**: Nexus
- **Issuer**: `GDTLOF5Q5EKPNMZWXOHSV6WHISWVDH535XUWFJGWIOQRXGWZJEGCE4LQ`

### Liquidity Pool Asset
- **Asset A**: XLM (Native Asset)
- **Asset B**: Nexus
- **Fee**: 30
- **Liquidity Pool ID**: `6010928f53911ce58f9747ba186fdd92f44049f0a7b082058a7d15bb7740ea33`

---

## 📊 Transaction Details

### A. Liquidity Pool Creation
- [View Transaction on Stellar Expert](https://stellar.expert/explorer/testnet/tx/cbd42be06bcc4513ece3c17a3707add9070fde2cf4c1558f5c914259e1ca075e)

### B. Swap Execution
- [View Transaction on Stellar Expert](https://stellar.expert/explorer/testnet/tx/6c0523ee5b5c18a51af72be384fdf9450628fa2bec2c338349dc6eafe65f0582)

### C. Withdrawal
- [View Transaction on Stellar Expert](https://stellar.expert/explorer/testnet/tx/6aa7c18348e263450ffc4437f70a4d93666a2edf09dea73604a6ce0e66ad95b8)

<img width="1074" alt="Stellar Swap Screenshot" src="https://github.com/user-attachments/assets/ed3c80a7-193e-4d37-a65e-78573fd57d2e">

---

## 👨‍💻 Author

**Made by Abhinav**
