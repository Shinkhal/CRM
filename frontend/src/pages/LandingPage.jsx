import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Landing = () => {
    const uri = import.meta.env.VITE_BACKEND_URL;
    const handleGoogleLogin = () => {
        window.location.href = `${uri}/auth/google`;
      };

  return (
    <>
      <Navbar />
      <div className="h-96 bg-neutral-600 text-white flex flex-col justify-center items-center px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight drop-shadow">
          Welcome to Mini CRM 🚀
        </h1>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
          onClick={handleGoogleLogin}
          className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition"
          >
          Sign in with Google
        </button>
        </div>
      </div>

      <section id="features" className="bg-white py-12 px-4 md:px-12 text-center text-gray-700">
        <h2 className="text-3xl font-bold mb-6">Why Choose Mini CRM?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold mb-2">👥 Customer Management</h3>
            <p>Add, view, and manage your customer base easily.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">📈 Smart Campaigns</h3>
            <p>Use AI to create personalized, high-performing campaigns.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">🧠 AI Insights</h3>
            <p>Use Gemini to generate targeting rules and messages instantly.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Landing;
