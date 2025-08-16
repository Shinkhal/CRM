![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4ea94b?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)

# 🧠 Mini CRM

A full-stack CRM platform designed to empower marketing teams with smart campaign management, customer insights, and AI-powered business intelligence.

---

## ✨ Key Features

- Customer & order management with automatic stats
- Campaign builder with real-time audience preview
- AI-powered segmentation and messaging
- Message delivery via **SMTP** & **WhatsApp**
- Business growth **insight generator** using **Google Gemini AI**
- Cookie-based secure authentication (backed by **Redis session store**)
- Fully responsive, modern UI with Tailwind CSS

---

## 📸 Screenshots

![image](https://github.com/user-attachments/assets/f0335666-55d8-45ec-ad39-97aa57293e5a)
![image](https://github.com/user-attachments/assets/1d5fa81b-f312-4131-b788-ddb15a5a45e9)
![image](https://github.com/user-attachments/assets/71710727-a45b-4690-be5e-9a436d2cbb7a)

---

## 🚀 Core Modules

### 👥 Customer Management

- Add, update, and view customer profiles
- Tracks `totalSpend`, `totalOrders`, `lastOrderDate` automatically

### 🛒 Order Management

- Orders linked to customers
- Auto-updates related customer stats on insertion

### 📣 Campaign Builder

- Input campaign name, message, and rules
- Uses **Google Gemini AI** to:
  - Parse natural language segment prompts into MongoDB queries
  - Suggest short, engaging marketing messages

### 👁️ Audience Preview

- View real-time filtered list of customers who match campaign criteria

### ✉️ Messaging Delivery

- Send messages through:
  - **📧 Email** via SMTP
  - **📱 WhatsApp** via external API
- All delivery logs are stored and viewable

### 📊 Campaign History & Logs

- Access all past campaigns
- View logs per customer, status (SENT/FAILED), and vendor response

### 📈 Business Insights (NEW)

- Route: `/reports`
- Fetches smart business tips via AI (`/api/dashboard/insights`)
- Helps users improve engagement, increase conversions, and grow their audience

### 🔐 Authentication

- **Google OAuth 2.0** via Passport.js
- **JWT stored in HTTP-only cookies**
  - Safer against XSS
  - Auto-sent in each API request
- Session management via **Redis** for scalability
- Route protection using React context + backend middleware

---

## 💡 AI-Powered Tools (Google Gemini)

| Feature                        | Route                     | Model                  |
|-------------------------------|---------------------------|------------------------|
| Prompt → Mongo filter         | `/api/ai/segment`         | `gemini-1.5-flash-8b`  |
| Segment goal → Message        | `/api/ai/messages`        | `gemini-2.0-flash`     |
| Dashboard Tips & Insights     | `/api/dashboard/insights` | `gemini-1.5-flash-8b`  |

---

## ✅ Feature Checklist

| Feature                                    | Status |
|-------------------------------------------|--------|
| Customer ingestion                        | ✅     |
| Order ingestion + stats update            | ✅     |
| Campaign creation + audience preview      | ✅     |
| SMTP email delivery                       | ✅     |
| WhatsApp message integration              | ✅     |
| Per-campaign delivery logs                | ✅     |
| AI prompt → MongoDB query                 | ✅     |
| AI message generator                      | ✅     |
| AI-powered growth tips (NEW)              | ✅     |
| Google OAuth 2.0 login                    | ✅     |
| **Redis-based session storage (NEW)**     | ✅     |
| HTTP-only cookie authentication           | ✅     |
| JWT middleware for route protection       | ✅     |
| Protected frontend routes                 | ✅     |
| Responsive Tailwind UI                    | ✅     |
| Dashboard overview with cards & stats     | ✅     |

---

## 🧪 Technologies Used

| Layer       | Stack                                    |
|-------------|------------------------------------------|
| Frontend    | React (Vite), Tailwind CSS, React Router |
| Backend     | Node.js, Express, Mongoose (MongoDB)     |
| AI Services | Google Gemini AI                         |
| Messaging   | Nodemailer (SMTP), WhatsApp API          |
| Auth        | Google OAuth 2.0, Passport.js, JWT       |
| State Mgmt  | React Context API                        |
| Session     | **Redis + connect-redis**                |
| UX Tools    | Toastify, Lucide Icons                   |

---

## 🧭 Routes Overview

### 🔐 Auth

* `POST /api/auth/google` — login
* `GET /api/auth/refresh` — refresh cookie
* `POST /api/auth/logout` — clears cookie

### 👥 Customers

* `POST /api/customers` — create
* `GET /api/customers` — list

### 🛒 Orders

* `POST /api/orders` — create
* `GET /api/orders` — list

### 📣 Campaigns

* `POST /api/campaigns` — create
* `GET /api/campaigns` — list
* `GET /api/campaigns/:id/logs` — delivery log

### 🧠 AI

* `POST /api/ai/segment` — prompt → MongoDB query
* `POST /api/ai/messages` — campaign goal → message
* `GET /api/dashboard/insights` — AI-powered business tips

### 🏥 Health Check

* `GET /health` — verify backend is running 

---

## 🗂️ Folder Structure

```

/backend
├── config/        
├── controllers/
├── models/
├── routes/
├── middleware/
├── services/      
└── server.js

/frontend
├── pages/
├── components/
├── routes/
├── context/
├── api/
└── App.jsx / main.jsx

````

---

## 🧑‍💻 Local Setup

### 🔧 Backend

```bash
cd backend
npm install
npm run dev
````

`.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173

# Redis
REDIS_URL=redis://localhost:6379

# Google AI
GOOGLE_GEMINI_API_KEY=your_gemini_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASS=your_password

# WhatsApp API
WHATSAPP_API_URL=https://api.example.com/send
WHATSAPP_API_KEY=your_key
```

---

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

Access: [http://localhost:5173](http://localhost:5173)

---

## 👨‍💻 Author

**Shinkhal Sinha**
🌐 [shinkhal-sinha.online](https://shinkhalsinha.vercel.app/)
📫 [shinkhalsinha@gmail.com](mailto:shinkhalsinha@gmail.com)

---

## 📝 License

Open-source project for learning and portfolio demonstration.
