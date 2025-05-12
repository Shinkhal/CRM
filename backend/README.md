## 📁 `backend/README.md`

# 🧠 Mini CRM – Backend (Node.js + MongoDB)

This is the **Node.js + Express** backend for the Mini CRM app. It handles customer and order ingestion, campaign logic, delivery simulation, authentication, and AI integrations using Google Gemini.

---

## ⚙️ Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Passport.js (Google OAuth)
- JWT for route protection
- Google Gemini AI API (gemini-2.0-flash)
- dotenv, cookie-parser, cors, express-session

---

## 📁 Folder Structure

````

backend/
├── models/             # Mongoose schemas (Customer, Order, Campaign, Log)
├── controllers/        # CRUD logic for each feature
├── routes/             # All REST API endpoints
├── middleware/         # Auth middleware
├── services/           # AI logic (Google Gemini)
├── config/             # MongoDB connection
├── auth/               # Google OAuth setup
└── server.js           # Entry point

````

---

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
````

### 2. Environment Variables

Create a `.env` file:

```
PORT=5000
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Dev Server

```bash
npm run dev
```

---

## 📬 API Endpoints

### 🔐 Auth

* `GET /auth/google` → initiate Google login
* `GET /auth/google/callback` → handle redirect
* `GET /auth/me` → return user info

### 👥 Customers

* `POST /api/customers` → add customer
* `GET /api/customers` → list customers

### 🛒 Orders

* `POST /api/orders` → create order
* `GET /api/orders` → list orders (populated)

### 📣 Campaigns

* `POST /api/campaigns` → create campaign (returns matched customers)
* `GET /api/campaigns` → list all campaigns

### ✉️ Logs

* `POST /api/logs/simulate` → simulate message delivery
* `GET /api/logs/:campaignId` → view logs for campaign

### 🤖 AI

* `POST /api/ai/segment` → prompt → MongoDB rule
* `POST /api/ai/messages` → prompt → message suggestions

---

## 📊 Data Models

* **Customer**: name, email, phone, totalSpend, totalOrders, lastOrderDate
* **Order**: customerId (ref), amount, createdAt
* **Campaign**: name, message, createdBy, segmentRules, audienceSize
* **CommunicationLog**: campaignId, customerId, message, status, vendorResponse

---

## 🧠 Gemini AI Output

**Prompt:**

```
"Users who spent over 10000 and ordered less than 3 times"
```

**Gemini Output:**

```json
{
  "spent": { "$gt": 10000 },
  "orders": { "$lt": 3 }
}
```

---

## 🔐 Auth Flow

* User hits `/auth/google`
* Auth callback redirects with JWT
* JWT is verified in protected routes via middleware

---

## 📦 Deployment Ready

* CORS configured
* MongoDB cloud supported
* Works with Render, Railway, or Fly.io
* Integrated with frontend hosted on Vercel

---

## 👨‍💻 Author

**Shinkhal Sinha**
🌐 [shinkhal-sinha.online](https://shinkhal-sinha.online)
📫 [shinkhalsinha@gmail.com](mailto:shinkhalsinha@gmail.com)

---

