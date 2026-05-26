import React from 'react';
import { Layers, Bot, FileText, Key, Heart, Gavel, Send } from 'lucide-react';

const AboutScreen = () => {
  return (
    <div className="min-h-screen bg-[#000] text-white p-4 md:p-8 font-inter pb-12 page-transition">
      <div className="max-w-3xl mx-auto mt-4">
        
        {/* Mission Statement */}
        <div className="text-center mb-12 mt-6">
          <h1 className="text-3xl md:text-5xl font-oswald uppercase font-bold mb-4 tracking-tight">
            Education for <span className="text-[#FFD700]">Everyone</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Our mission is simple: To provide high-quality education to students who cannot afford expensive coaching institutes. 
            <br />Knowledge should be free, or at least affordable.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 text-center hover:border-[#333] hover:-translate-y-1 transition-all">
            <Layers className="w-10 h-10 text-[#FFD700] mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2 font-oswald tracking-wide">Structured Learning</h3>
            <p className="text-xs text-gray-500 leading-relaxed">No more random searches. Get all lectures arranged Chapter-wise and Topic-wise in perfect sequence.</p>
          </div>
          
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 text-center hover:border-[#333] hover:-translate-y-1 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <span className="bg-[#FFD700] text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Free</span>
            </div>
            <Bot className="w-10 h-10 text-[#FFD700] mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2 font-oswald tracking-wide">AI Support</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Stuck somewhere? Ask Naino AI. Your personal doubt solver is available 24/7 for free.</p>
          </div>
          
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 text-center hover:border-[#333] hover:-translate-y-1 transition-all">
            <FileText className="w-10 h-10 text-[#FFD700] mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2 font-oswald tracking-wide">Notes & DPPs</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Premium handwritten notes and Daily Practice Problems included with every lecture.</p>
          </div>
        </div>

        {/* Transparency & Policy */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 md:p-8 mb-10">
          <h2 className="text-xl font-oswald text-white mb-6 border-b border-white/10 pb-4 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangleIcon /> Important Policy
          </h2>
          
          <div className="mb-8">
            <h4 className="font-bold text-gray-200 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#FFD700]" /> Token Sharing
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed pl-7">
              Your access key is linked to your device. <span className="text-red-500 font-bold">DO NOT SHARE IT.</span> 
              If our system detects multiple logins, your key will be permanently blocked.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-200 mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#FFD700]" /> Financial Transparency
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed pl-7 mb-3">
              We are <span className="text-[#FFD700] font-bold">NOT</span> here to make a profit. The small fee we charge goes 100% into:
            </p>
            <ul className="list-disc text-sm text-gray-500 pl-12 space-y-1">
              <li>Server & Database maintenance costs.</li>
              <li>Keeping the platform Ad-Free and Fast.</li>
              <li>Developing new tools like AI and Test Portal.</li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 md:p-8">
          <h3 className="text-red-500 font-bold mb-3 text-sm uppercase flex items-center gap-2 tracking-wider">
            <Gavel className="w-4 h-4" /> Copyright & DMCA Notice
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            We respect the hard work of educators and institutes. If any content owner has an objection to their content being listed here, 
            we request you to kindly <strong className="text-gray-200">inform us first</strong> before taking any legal action.
            <br /><br />
            We are ready to remove the content immediately upon request. This platform is solely created to help underprivileged students.
          </p>
          
          <a 
            href="https://t.me/nainochatbot" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-[#222] border border-[#333] text-gray-300 py-3 rounded-xl text-sm font-bold hover:bg-[#333] hover:text-white transition-colors"
          >
            <Send className="w-4 h-4 text-[#FFD700]" /> Contact Admin for Removal / Support
          </a>
        </div>

        <p className="text-center text-gray-600 text-xs mt-12 font-medium tracking-wide">
          &copy; 2025 Naino Academy. Built for Students.
        </p>

      </div>
    </div>
  );
};

// Helper component
const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

export default AboutScreen;
