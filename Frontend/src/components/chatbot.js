"use client"

import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import hljs from "highlight.js"
import javascript from "highlight.js/lib/languages/javascript"
import "highlight.js/styles/atom-one-dark.css"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare,
  Send,
  Trash,
  Plus,
  Moon,
  Sun,
  X,
  Menu,
  PanelLeft,
  PanelRight,
  ArrowLeft,
} from "lucide-react"

// Register the language with highlight.js
hljs.registerLanguage("javascript", javascript)

// Add a style element to force dark theme globally with bluish glow effects for chatbot
const chatbotDarkModeStyle = `
  body, html {
    background-color: #0F0F13 !important;
    color: white !important;
    background-image: radial-gradient(circle at 15% 50%, rgba(77, 93, 254, 0.08) 0%, transparent 45%), 
                      radial-gradient(circle at 85% 30%, rgba(77, 93, 254, 0.08) 0%, transparent 55%);
    background-attachment: fixed;
  }
  
  /* Add glowing effect to certain elements */
  .glow-effect {
    box-shadow: 0 0 25px rgba(77, 93, 254, 0.15);
  }
  
  .card-glow {
    box-shadow: 0 4px 20px -5px rgba(77, 93, 254, 0.25);
  }
  
  .avatar-glow {
    box-shadow: 0 0 15px rgba(77, 93, 254, 0.2);
  }
  
  .input-glow:focus {
    box-shadow: 0 0 10px rgba(77, 93, 254, 0.3);
  }
  
  /* Custom scrollbar styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(25, 25, 35, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(77, 93, 254, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(77, 93, 254, 0.7);
  }
  
  /* Enhance message styling */
  .message-user {
    background: linear-gradient(135deg, #4D5DFE 0%, #3A4AE1 100%);
    box-shadow: 0 4px 15px -3px rgba(77, 93, 254, 0.25);
  }
  
  .message-bot {
    background-color: rgba(20, 20, 27, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(42, 42, 58, 0.8);
    box-shadow: 0 4px 15px -5px rgba(0, 0, 0, 0.2);
  }
  
  /* Enhanced button effects */
  .send-button {
    background: linear-gradient(135deg, #4D5DFE 0%, #3A4AE1 100%);
    box-shadow: 0 0 15px rgba(77, 93, 254, 0.3);
  }
  
  .send-button:hover {
    box-shadow: 0 0 20px rgba(77, 93, 254, 0.4);
  }
`;

export default function ChatbotPage() {
  const [userInput, setUserInput] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true) // Default to dark mode
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState("")
  const [isNamingChat, setIsNamingChat] = useState(false)
  const [newChatName, setNewChatName] = useState("")
  const chatContainerRef = useRef(null)
  const textareaRef = useRef(null)

  // Apply the custom dark theme style on component mount
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = chatbotDarkModeStyle;
    document.head.appendChild(style);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [userInput])

  // Scroll to bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory, isLoading])

  // Load conversations from local storage
  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations")
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations))
    }

    const savedActiveConversation = localStorage.getItem("activeConversation")
    if (savedActiveConversation) {
      setActiveConversation(savedActiveConversation)
      const activeChat = JSON.parse(savedConversations).find(
        (conv) => conv.id === savedActiveConversation,
      )
      if (activeChat) {
        setChatHistory(activeChat.messages)
      }
    }

    const savedTheme = localStorage.getItem("chatbotTheme")
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark")
    }
  }, [])

  // Save conversations to local storage
  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations))
  }, [conversations])

  // Save active conversation to local storage
  useEffect(() => {
    localStorage.setItem("activeConversation", activeConversation)
  }, [activeConversation])

  // Save theme to local storage
  useEffect(() => {
    localStorage.setItem("chatbotTheme", isDarkMode ? "dark" : "light")
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const updateChatHistory = (newMessages) => {
    setChatHistory(newMessages)

    // Update the conversations array with new messages
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          return { ...conv, messages: newMessages }
        }
        return conv
      }),
    )
  }

  const createNewChat = () => {
    const newChatId = uuidv4()
    const newChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
    }

    setConversations((prevConversations) => [...prevConversations, newChat])
    setActiveConversation(newChatId)
    setChatHistory([])
    setIsNamingChat(true)
    setNewChatName("")
    setIsMenuOpen(false)
  }

  const saveChatName = () => {
    if (newChatName.trim()) {
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return { ...conv, title: newChatName.trim() }
          }
          return conv
        }),
      )
    }
    setIsNamingChat(false)
  }

  const handleNameKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveChatName()
    }
  }

  const switchConversation = (id) => {
    setActiveConversation(id)
    const selectedChat = conversations.find((conv) => conv.id === id)
    if (selectedChat) {
      setChatHistory(selectedChat.messages)
    }
    setIsMenuOpen(false)
  }

  const deleteConversation = (id, e) => {
    e.stopPropagation()
    setConversations((prevConversations) => 
      prevConversations.filter((conv) => conv.id !== id)
    )

    if (activeConversation === id) {
      createNewChat()
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSendMessage = async () => {
    const trimmedInput = userInput.trim()
    if (!trimmedInput || isLoading) {
      return
    }

    const userMessage = {
      sender: "user",
      text: trimmedInput,
    }

    // Add user message to chat history
    const updatedChatHistory = [...chatHistory, userMessage]
    setChatHistory(updatedChatHistory)

    // Update conversations with user message
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          return { ...conv, messages: [...conv.messages, userMessage] }
        }
        return conv
      }),
    )

    // Clear input field
    setUserInput("")
    setIsLoading(true)

    try {
      const combinedMessages = updatedChatHistory.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        parts: [{ text: msg.text }],
      }))

      // Make API call to Gemini API
      const response = await fetch("http://localhost:3050/api/chat", {
          method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: combinedMessages }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Error communicating with API")
      }
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Empty response from API")
      }
      
      if (!data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        return
      }

      // Clean and format the response
      const rawResponse = data.candidates[0].content.parts[0].text
      const formattedResponse = rawResponse
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Convert **bold** to <strong>
        .replace(/\*(.*?)\*/g, "<em>$1</em>") // Convert *italic* to <em>
        .replace(/```([a-z]*)\n([\s\S]*?)```/g, (_, lang, code) => {
          const highlightedCode = hljs.highlightAuto(code).value
          return `<pre class="bg-[#0d0d0d] text-white p-4 rounded-md overflow-x-auto mt-2 mb-2 border border-[#2d2d2d]"><code class="hljs">${highlightedCode}</code></pre>`
        })
        .replace(/\n/g, "<br>") // Preserve line breaks
        .replace(/- (.*?)(?=<br>|$)/g, "• $1<br>") // Convert bullet points

      const botMessage = {
        sender: "bot",
        text: formattedResponse,
      }

      // Add bot message to chat history
      setChatHistory((prevHistory) => [...prevHistory, botMessage])

      // Update conversations with bot message
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return { ...conv, messages: [...conv.messages, botMessage] }
          }
          return conv
        }),
      )
    } catch (error) {
      console.error("Error communicating with API:", error)
      const errorMessage = {
        sender: "bot",
        text: "Error communicating with API. Please check your connection and try again.",
      }
      setChatHistory((prevHistory) => [...prevHistory, errorMessage])
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === activeConversation) {
            return { ...conv, messages: [...conv.messages, errorMessage] }
          }
          return conv
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-[#0F0F13] text-white">
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-10"
            onClick={toggleMenu}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || isMenuOpen) && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="fixed md:relative z-20 w-72 h-full flex flex-col bg-[#14141B]/90 border-r border-[#2A2A3A] shadow-xl backdrop-blur-sm"
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A]">
              <h1 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#4D5DFE] to-[#3A4AE1]">AI Chatbot</h1>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-[#2A2A3A]/50 transition-colors"
                >
                  {isDarkMode ? <Sun size={18} className="text-[#a0a0a0]" /> : <Moon size={18} />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMenu}
                  className="md:hidden p-2 rounded-full hover:bg-[#2A2A3A]/50 transition-colors"
                >
                  <X size={18} className="text-[#a0a0a0]" />
                </motion.button>
              </div>
            </div>

            {/* New chat button */}
            <div className="p-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createNewChat}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg bg-[#4D5DFE]/10 hover:bg-[#4D5DFE]/20 text-white font-medium border border-[#4D5DFE]/20 shadow-lg glow-effect transition-all duration-300"
              >
                <Plus size={18} className="text-[#4D5DFE]" />
                <span>New Chat</span>
              </motion.button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-2">
                <h2 className="px-2 text-sm font-medium uppercase text-[#8F8FA3] mb-2">Recent Conversations</h2>
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    onClick={() => switchConversation(conv.id)}
                    className={`flex items-center justify-between p-3 mb-1 rounded-lg cursor-pointer group ${
                      activeConversation === conv.id
                        ? "bg-[#2A2A3A]/70 text-white border border-[#2A2A3A] card-glow"
                        : "hover:bg-[#1E1E29]/60 text-[#D1D1E0]"
                    } transition-all duration-200`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="flex-shrink-0 p-2 rounded-md bg-[#4D5DFE]/10 border border-[#4D5DFE]/20">
                        <MessageSquare size={14} className="text-[#4D5DFE]" />
                      </div>
                      <span className="truncate text-sm">{conv.title}</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-[#363636] text-[#8F8FA3] hover:text-white transition-opacity"
                    >
                      <Trash size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sidebar footer - Link to landing page */}
            <div className="p-4 border-t border-[#2A2A3A] mt-auto">
              <Link to="/home">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-[#1E1E29]/80 hover:bg-[#1E1E29] text-[#8F8FA3] border border-[#2A2A3A] text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Home</span>
                </motion.button>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A3A] bg-[#14141B]/90 shadow-md backdrop-blur-sm">
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMenu}
              className="md:hidden p-2 mr-2 rounded-full hover:bg-[#2A2A3A]/50 text-[#8F8FA3]"
            >
              <Menu size={18} />
            </motion.button>
            
            <h2 className="font-medium truncate text-[#D1D1E0]">
              {conversations.find((conv) => conv.id === activeConversation)?.title || "New Chat"}
            </h2>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            className="hidden md:block p-2 rounded-full hover:bg-[#2A2A3A]/50 text-[#8F8FA3]"
          >
            {isSidebarOpen ? <PanelLeft size={18} /> : <PanelRight size={18} />}
          </motion.button>
        </div>

        {/* Chat container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar"
          style={{
            backgroundImage: "radial-gradient(circle at 25% 25%, rgba(77, 93, 254, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(77, 93, 254, 0.03) 0%, transparent 50%)"
          }}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome message if no messages */}
            {chatHistory.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center p-8 rounded-xl bg-[#14141B]/80 border border-[#2A2A3A] shadow-lg backdrop-blur-sm card-glow"
              >
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br from-[#4D5DFE] to-[#3A4AE1] border border-[#2A2A3A] avatar-glow">
                  <MessageSquare size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">Welcome to AI Chatbot</h3>
                <p className="text-[#8F8FA3] mb-6">Ask me anything and I'll do my best to help!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md mx-auto text-sm">
                  {["How can I learn React?", "Write a poem about coding", "What are the best practices for API design?", "Explain quantum computing"].map((suggestion, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setUserInput(suggestion)}
                      className="p-2 rounded-lg text-left truncate bg-[#1E1E29]/80 hover:bg-[#2A2A3A]/70 text-[#D1D1E0] border border-[#2A2A3A] transition-colors"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Chat messages */}
            <AnimatePresence>
              {chatHistory.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 > 0.5 ? 0.5 : index * 0.1 }}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                      message.sender === "user"
                        ? "message-user text-white rounded-tr-none"
                        : "message-bot text-white rounded-tl-none"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.sender === "user" ? message.text : <div dangerouslySetInnerHTML={{ __html: message.text }} />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-[#14141B]/80 text-[#8F8FA3] border border-[#2A2A3A] backdrop-blur-sm">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-[#4D5DFE] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#4D5DFE] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#4D5DFE] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-[#2A2A3A] bg-[#14141B]/90 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto relative">
            {/* Rename chat interface */}
            {isNamingChat ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-lg bg-[#1E1E29]/90 border border-[#2A2A3A] card-glow backdrop-blur-sm"
              >
                <label className="block text-sm font-medium mb-2 text-[#8F8FA3]">Name this conversation</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    onKeyPress={handleNameKeyPress}
                    placeholder="Enter a name for this chat"
                    className="flex-1 rounded-lg p-2 bg-[#0F0F13] border border-[#2A2A3A] text-white focus:border-[#4D5DFE] focus:outline-none input-glow transition-colors"
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={saveChatName}
                    className="px-4 py-2 rounded-lg bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white shadow-md glow-effect"
                  >
                    Save
                  </motion.button>
                </div>
              </motion.div>
            ) : null}

            {/* Message input */}
            <div className="flex items-end space-x-2 rounded-xl p-2 bg-[#1E1E29]/80 border border-[#2A2A3A] shadow-lg backdrop-blur-sm">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 resize-none overflow-y-auto max-h-28 p-3 rounded-lg bg-[#14141B]/70 text-white placeholder-[#8F8FA3] border border-[#2A2A3A] focus:border-[#4D5DFE] focus:ring-0 focus:outline-none input-glow transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isLoading}
                className={`p-3 rounded-full transition-all ${
                  !userInput.trim() || isLoading
                    ? "bg-[#1E1E29] text-[#8F8FA3] cursor-not-allowed border border-[#2A2A3A]"
                    : "send-button text-white"
                }`}
              >
                <Send size={20} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

