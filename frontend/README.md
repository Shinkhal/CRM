## 📁 `frontend/README.md`

# 🎨 Mini CRM – Frontend

This is the **React + Vite** frontend for the Mini CRM platform built as part of the Xeno SDE Internship Assignment 2025. It offers a responsive and modern UI for managing customers, orders, campaigns, and AI-based targeting.

---

## ⚙️ Tech Stack

- **React + Vite**
- **Tailwind CSS**
- **React Router DOM**
- **Axios**
- **JWT Authentication**
- **Google OAuth 2.0 (via backend)**

---

## 🚀 Features

- 🌐 Landing page with hero section
- 👥 Customers management (add, list)
- 🛒 Orders page with customer linking
- 🧠 Campaign builder with:
  - Segment rule input
  - Audience preview
  - AI-powered prompt → rule conversion
  - AI message suggestion
- 📬 Campaign delivery simulation
- 📊 Campaign history viewer
- 📈 Campaign delivery logs
- 🔐 Login via Google (OAuth)
- 🔁 Logout + global top navbar
- 🔒 Route protection using JWT
- 💬 Clean, responsive UI with Tailwind CSS

---

## 📁 Folder Structure

```

src/
├── api/              # Axios base config
├── components/       # Navbar
├── pages/            # Landing, Customers, Orders, Campaigns, History, Logs
├── routes/           # PrivateRoute for auth guard
├── App.jsx
└── main.jsx

````

---

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
````

### 2. Run Dev Server

```bash
npm run dev
```

### 3. Set Environment

In `.env` or via hardcoded axios baseURL:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

> Ensure the backend is running on the port mentioned above.

---

## 🔐 Authentication Flow

* Login page redirects to backend `/auth/google`
* Google auth callback hits frontend route `/auth-success?token=...`
* Token is stored in `localStorage`
* Protected pages check token and restrict access

---

## 📝 Notes

* Token is automatically added to all API calls via Axios interceptors.
* If the token is missing or invalid, users are redirected to `/login`.



---

## 👨‍💻 Author

**Shinkhal Sinha**
🌐 [shinkhal-sinha.online](https://shinkhal-sinha.online)
📫 [shinkhalsinha@gmail.com](mailto:shinkhalsinha@gmail.com)

---

