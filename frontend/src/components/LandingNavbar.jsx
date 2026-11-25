import { Link } from 'react-router-dom';
import { Building2, Sparkles, ArrowRight } from 'lucide-react';

const LandingNavbar = () => {
  return (
    <nav className="bg-[#F6F7FA]/80 backdrop-blur-md border-b border-[#E2E6EE] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center gap-3 group"
            >
              {/* Tactile Embossed Icon Box */}
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E6EE] shadow-xs flex items-center justify-center text-[#181E29] group-hover:scale-105 transition-transform"
                   style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.06), inset 0 1px 0 #FFF' }}>
                <Building2 className="w-5 h-5 text-[#181E29]" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-extrabold text-[#111827] tracking-tight">
                  Nexus
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4B5563]">
            <a href="#features" className="hover:text-[#111827] transition-colors">
              Platform Features
            </a>
            <a href="#architecture" className="hover:text-[#111827] transition-colors">
              Tenancy Architecture
            </a>
            <a href="#security" className="hover:text-[#111827] transition-colors">
              Security
            </a>
            <Link 
              to="/login?demo=true" 
              className="skeuo-badge hover:bg-[#EEF1F6] transition-colors text-[#181E29]"
            >
              <span className="skeuo-led-amber" />
              <span>Instant Demo</span>
            </Link>
          </div>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="skeuo-button text-xs sm:text-sm py-2 px-3.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="skeuo-button-dark text-xs sm:text-sm py-2 px-4 gap-1.5"
            >
              <span>Register</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
