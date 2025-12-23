import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Snowfall from 'react-snowfall';

const Landing = () => {
  const [isVisible, setIsVisible] = useState(false);
  const uri = import.meta.env.VITE_BACKEND_URL;
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${uri}/auth/google`;
  };

  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <div className="min-h-100 bg-gradient-to-br from-accent-glow to-secondary relative overflow-hidden flex flex-col justify-center items-center px-4 text-center pt-20 pb-20">
      <Snowfall  />

        <div className={`relative z-10 max-w-4xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight bg-text-primary bg-clip-text text-transparent">
            Welcome to Mini CRM 🚀
          </h1>
          
          <p className="text-xl md:text-2xl text-text-secondary mb-12 max-w-2xl mx-auto">
            Streamline your customer relationships with AI-powered insights and intelligent campaign management
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGoogleLogin}
              className="group relative bg-gradient-to-r from-accent to-accent-glow text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-glow transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </span>
              <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="bg-secondary py-20 px-4 md:px-12 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-text-primary to-accent bg-clip-text text-transparent">
              Why Choose Mini CRM?
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Everything you need to manage customers and create winning campaigns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="group bg-elevated backdrop-blur-sm border border-border-soft rounded-2xl p-8 hover:border-accent hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-glow rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-text-primary">Customer Management</h3>
              <p className="text-text-secondary leading-relaxed">
                Add, view, and manage your customer base easily with intuitive tools and powerful search capabilities.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group bg-elevated backdrop-blur-sm border border-border-soft rounded-2xl p-8 hover:border-accent hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-glow rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📈</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-text-primary">Smart Campaigns</h3>
              <p className="text-text-secondary leading-relaxed">
                Use AI to create personalized, high-performing campaigns that resonate with your audience.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group bg-elevated backdrop-blur-sm border border-border-soft rounded-2xl p-8 hover:border-accent hover:shadow-glow transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-glow rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🧠</span>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-text-primary">AI Insights</h3>
              <p className="text-text-secondary leading-relaxed">
                Use Gemini to generate targeting rules and messages instantly with intelligent recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Landing;