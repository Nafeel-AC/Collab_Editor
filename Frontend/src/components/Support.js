import React, { useState } from 'react';
import { Search, ChevronDown, Mail, FileText, Users, ArrowLeft } from 'lucide-react';
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import StyledButton from './StyledButton';




function Support() {
  const [faqs, setFaqs] = useState([
    {
      question: "How do I get started with the collaborative features?",
      answer: "To begin using the collaborative features, start by creating a new project. You can then invite colleagues by entering their email addresses. Once they have joined, everyone can work together in real time, making teamwork seamless and efficient.",
      isOpen: false
    },
    {
      question: "What are the system requirements?",
      answer: "The system requirements for using our collaborative features are as follows: a modern web browser (Chrome, Firefox, Safari), a stable internet connection, and a device with at least 4GB of RAM. For the best experience, we recommend using the latest version of your browser.",
      isOpen: false
    },
    {
      question: "How do I manage team permissions?",
      answer: "You can manage team permissions by going to the 'Team Settings' section in your project dashboard. Here, you can assign different roles to team members, such as Admin, Editor, or Viewer, which will determine their level of access and control over the project.",
      isOpen: false
    },
    {
      question: "Is there a limit to team size?",
      answer: "Yes, there is a limit to the number of team members you can invite to a project. The maximum number of collaborators allowed is 10 for the free plan. If you need more collaborators, consider upgrading to our premium plan, which allows for unlimited team members.",
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
        <h1 className="text-4xl font-bold mb-2">Support Hub</h1>
        <p className="text-gray-400 mb-8">Need help? Anytime, Anywhere</p>
        
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
              <StyledButton type="submit">
                Submit
              </StyledButton>
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