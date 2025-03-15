import React, { useState } from 'react';
import { Search, ChevronDown, Mail, FileText, Users, ArrowLeft } from 'lucide-react';
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

function Support() {
  const [faqs, setFaqs] = useState([
    {
      question: "How do I get started with the collaborative features?",
      answer: "Our collaborative features allow real-time editing with team members. Simply create a project and invite team members using their email addresses.",
      isOpen: false
    },
    {
      question: "What are the system requirements?",
      answer: "Our editor works best on modern browsers like Chrome, Firefox, and Safari. We recommend at least 4GB RAM and a stable internet connection.",
      isOpen: false
    },
    {
      question: "How do I manage team permissions?",
      answer: "Team permissions can be managed from the project settings. You can set different access levels: Admin, Editor, and Viewer.",
      isOpen: false
    },
    {
      question: "Is there a limit to team size?",
      answer: "Team size limits depend on your subscription plan. Free plans support up to 3 members, while paid plans support unlimited team members.",
      isOpen: false
    }
  ]);

  const toggleFAQ = (index) => {
    setFaqs(faqs.map((faq, i) => ({
      ...faq,
      isOpen: i === index ? !faq.isOpen : faq.isOpen
    })));
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div style={{ width: "100px", height: "100px" }}>
            <DotLottieReact
              src="https://lottie.host/e70593df-9814-4f0e-a60e-ca52c28dfa7e/TjEft76edE.lottie"
              loop
              autoplay
              renderer="svg"
              onError={(error) => {
                console.error("Lottie Error:", error);
              }}
            />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-2">Support Center</h1>
        <p className="text-gray-400 mb-8">Need help? We're here for you!</p>
        
        {/* Search Bar */}
        <div className="relative mb-16">
          <Search className="absolute left-4 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full bg-[#1A1D23] rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Common Issues & FAQs</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-[#1A1D23] rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full px-4 py-4 text-left flex justify-between items-center"
                    onClick={() => toggleFAQ(index)}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`transform transition-transform ${
                        faq.isOpen ? 'rotate-180' : ''
                      }`}
                      size={20}
                    />
                  </button>
                  {faq.isOpen && (
                    <div className="px-4 pb-4 text-gray-400">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-xl font-semibold mb-6">Contact Support</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full bg-[#1A1D23] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-[#1A1D23] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Issue Description</label>
                <textarea
                  placeholder="Describe your issue..."
                  rows={6}
                  className="w-full bg-[#1A1D23] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-3 transition-colors"
              >
                Submit
              </button>
              <div className="flex items-center justify-center text-gray-400 mt-4">
                <Mail size={16} className="mr-2" />
                <span>nafeelmannan@gmail.com</span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-wrap items-center justify-between">
          <div className="flex space-x-6">
            <a href="#" className="flex items-center text-gray-400 hover:text-white">
              <FileText size={16} className="mr-2" />
              Documentation
            </a>
            <a href="#" className="flex items-center text-gray-400 hover:text-white">
              <Users size={16} className="mr-2" />
              Community Forum
            </a>
          </div>
          <button className="flex items-center text-gray-400 hover:text-white bg-[#1A1D23] px-4 py-2 rounded-lg">
            <ArrowLeft size={16} className="mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Support;