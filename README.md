![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4ea94b?logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)

# 🧠 Mini CRM

A full-stack CRM platform designed to empower marketing teams with smart campaign management and customer insights.

Key functionalities include:

* Ingest and manage customer + order data
* Build targeted AI-assisted campaigns
* Deliver messages via **Email (SMTP)** and **WhatsApp**
* Track delivery logs and gain performance insights

Built with **Node.js**, **React (Vite)**, **MongoDB**, **Tailwind CSS**, and **Google Gemini AI**.

---

## ScreenShots
![image](https://github.com/user-attachments/assets/f0335666-55d8-45ec-ad39-97aa57293e5a)
![image](https://github.com/user-attachments/assets/1d5fa81b-f312-4131-b788-ddb15a5a45e9)
![image](https://github.com/user-attachments/assets/71710727-a45b-4690-be5e-9a436d2cbb7a)


## 🚀 Core Features

### 👥 Customer Management

* Add new customers with name, email, and phone
* View all customers in a responsive table

### 🛒 Order Management

* Add new orders linked to customers
* Automatically updates:

  * Total spend
  * Total orders
  * Last order date

### 📣 Campaign Builder

* Input campaign name, message, and segmentation rules
* Use AI to:

  * Convert prompts like “users who spent over 10K and ordered < 3 times” into MongoDB filters
  * Suggest engaging marketing messages

### 🔍 Audience Preview

* View which customers match the segmentation rule in real-time
* Display customer name, spend, and order count before launching campaign

### ✉️ Message Delivery

* Send campaign messages via:

  * 📧 **Email** using SMTP server
  * 📱 **WhatsApp** via messaging API
* All delivery attempts are logged in `CommunicationLog`
* Logs include:

  * Customer name
  * Message content
  * Delivery status (✅ SENT / ❌ FAILED)
  * Vendor response
  * Timestamp

### 🧠 AI-Powered Tools (Google Gemini)

* **Prompt → Segment Rule** (via `/api/ai/segment`)
* **Campaign Goal → Message** (via `/api/ai/messages`)
* Gemini model used: `gemini-2.0-flash`

### 📊 Campaign History

* View all past campaigns
* Displays campaign name, audience size, and creation date
* Access delivery logs for each campaign

### 📬 Campaign Log Viewer

* Per-campaign delivery log viewer
* Shows message status, customer details, and response data

### 🔐 Authentication

* Google OAuth 2.0 login
* JWT-based authentication
* Frontend stores token and protects routes

### 🖥️ Frontend UI

* Built with React + Vite
* Fully responsive and styled with Tailwind CSS
* Global top navbar with route links
* Custom `PrivateRoute` component for route protection

---

## 🧪 Technologies Used

| Layer       | Stack                                    |
| ----------- | ---------------------------------------- |
| Frontend    | React (Vite), Tailwind CSS, React Router |
| Backend     | Node.js, Express, Mongoose (MongoDB)     |
| AI Services | Google Gemini AI API                     |
| Messaging   | Nodemailer (SMTP), WhatsApp API          |
| Auth        | Google OAuth 2.0, JWT, Passport.js       |
| Tools       | Axios, dotenv, cookie-parser             |

---

## 🔧 Local Setup

### 📦 Backend

```bash
cd backend
npm install
npm run dev
```

`.env` file:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (SMTP) Config
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password

# WhatsApp API
WHATSAPP_API_URL=https://your_whatsapp_api.com/send
WHATSAPP_API_KEY=your_whatsapp_api_key
```

---

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on: [http://localhost:5173](http://localhost:5173)

---

## 🌐 Deployment

| Platform | URL    |
| -------- | ------ |
| Frontend | Vercel |
| Backend  | Render |

---

## 📁 Folder Structure

```
/backend
  ├── models/
  ├── controllers/
  ├── routes/
  ├── services/         # AI + messaging logic
  ├── middleware/
  └── server.js

/frontend
  ├── pages/
  ├── components/
  ├── routes/
  ├── api/
  └── App.jsx / main.jsx
```

---

## ✅ Feature Checklist

| Feature                              | Status |
| ------------------------------------ | ------ |
| Customer ingestion                   | ✅      |
| Order ingestion + stats update       | ✅      |
| Campaign creation with segment rules | ✅      |
| Real email delivery (SMTP)           | ✅      |
| WhatsApp message integration         | ✅      |
| Campaign preview (audience matching) | ✅      |
| Campaign history viewer              | ✅      |
| Campaign delivery log viewer         | ✅      |
| AI prompt → Mongo filter (Gemini)    | ✅      |
| AI message suggestion (Gemini)       | ✅      |
| Google OAuth 2.0 auth + JWT          | ✅      |
| Global navbar + logout               | ✅      |
| Protected routes (frontend)          | ✅      |
| Fully responsive Tailwind UI         | ✅      |

---

## 🧠 Sample AI Output

**Prompt:**

```
Users who spent over 10000 and ordered less than 3 times
```

**Gemini Output:**

```json
{
  "spent": { "$gt": 10000 },
  "orders": { "$lt": 3 }
}
```

**AI-Generated Message:**

```
We miss you! Here's 10% off your next order. Shop now!
```

---

## 👨‍💻 Author

**Shinkhal Sinha**
🌐 [shinkhal-sinha.online](https://shinkhal-sinha.online)
📫 [shinkhalsinha@gmail.com](mailto:shinkhalsinha@gmail.com)

---

## 📄 License

This is an open-source CRM project built for learning and demonstration purposes.

