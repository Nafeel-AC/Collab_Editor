import React from "react";
import Footer from "./Footer";

const features = [
  {
    title: "Real-Time Collaboration",
    desc: "Work together with your team instantly. See changes as they happen, no refresh needed.",
    icon: (
      <svg className="w-10 h-10 text-cyan-400 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m9-4.13a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm6 4v2a4 4 0 0 1-3 3.87M3 16v2a4 4 0 0 0 3 3.87" />
      </svg>
    ),
  },
  {
    title: "Live Chat",
    desc: "Communicate with your team without leaving the editor. Stay connected and productive.",
    icon: (
      <svg className="w-10 h-10 text-cyan-400 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Version Control",
    desc: "Track changes, revert to previous versions, and never lose your progress.",
    icon: (
      <svg className="w-10 h-10 text-cyan-400 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4.998v12.002" />
      </svg>
    ),
  },
];

const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col">
    {/* Hero Section */}
    <header className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
      <h1 className="text-5xl md:text-6xl font-extrabold text-cyan-400 mb-4 futuristic-font drop-shadow-lg">
        Experience Collaborative Editing
      </h1>
      <p className="text-lg md:text-2xl text-cyan-100 mb-8 max-w-2xl mx-auto opacity-90">
        Empower your team to code, write, and create together in real time. Fast, secure, and beautifully futuristic.
      </p>
      <a
        href="/signup"
        className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-white text-lg font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/40"
      >
        Get Started Free
      </a>
    </header>

    {/* Features Section */}
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center futuristic-font">
        Features
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-[#1a2a36] rounded-2xl p-8 shadow-xl border border-[#2c5364] transition-all duration-300
              hover:scale-105 hover:shadow-cyan-400/40 hover:border-cyan-400 hover:bg-[#232526] cursor-pointer group"
          >
            <div>{feature.icon}</div>
            <h3 className="text-xl font-bold text-cyan-300 mb-2 group-hover:text-white transition">{feature.title}</h3>
            <p className="text-cyan-100 group-hover:text-cyan-200 transition">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Call to Action */}
    <section className="text-center py-12">
      <h3 className="text-2xl md:text-3xl font-semibold text-cyan-200 mb-4">
        Ready to boost your productivity?
      </h3>
      <a
        href="/signup"
        className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-white text-lg font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/40"
      >
        Start Collaborating Now
      </a>
    </section>

    {/* Footer */}
    <Footer />
  </div>
);

export default LandingPage;