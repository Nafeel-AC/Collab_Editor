"use client"

import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import hljs from "highlight.js/lib/core"
import javascript from "highlight.js/lib/languages/javascript"
import "highlight.js/styles/github-dark.css"

// Register the language with highlight.js
hljs.registerLanguage("javascript", javascript)

export default function ChatbotPage() {
  const [userInput, setUserInput] = useState("")
  const [chatHistory, setChatHistory] = useState(() => {
    const savedHistory = localStorage.getItem("chatHistory")
    return savedHistory ? JSON.parse(savedHistory) : []
  })
  const [conversations, setConversations] = useState(() => {
    const savedConversations = localStorage.getItem("conversations")
    return savedConversations ? JSON.parse(savedConversations) : [{ id: "default", title: "New Chat", messages: [] }]
  })
  const [activeConversation, setActiveConversation] = useState(() => {
    const savedActive = localStorage.getItem("activeConversation")
    return savedActive || "default"
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isNamingChat, setIsNamingChat] = useState(false)
  const [newChatName, setNewChatName] = useState("")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const chatContainerRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px" // Updated from 50px
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [userInput])

  // Load active conversation messages into chat history
  useEffect(() => {
    const currentConversation = conversations.find((conv) => conv.id === activeConversation)
    if (currentConversation) {
      setChatHistory(currentConversation.messages)
    }
  }, [activeConversation, conversations])

  // Save active conversation ID
  useEffect(() => {
    localStorage.setItem("activeConversation", activeConversation)
  }, [activeConversation])

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations))
  }, [conversations])

  // Scroll to bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  // Toggle dark/light mode
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const updateChatHistory = (newMessages) => {
    // Update the chat history state
    setChatHistory((prevHistory) => [...prevHistory, ...newMessages])

    // Update the conversations state
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          const updatedMessages = [...conv.messages, ...newMessages]
          // Update title if needed
          let title = conv.title
          if (title === "New Chat" && updatedMessages.length >= 1 && updatedMessages[0].sender === "user") {
            title = updatedMessages[0].text.slice(0, 30) + (updatedMessages[0].text.length > 30 ? "..." : "")
          }
          return { ...conv, messages: updatedMessages, title }
        }
        return conv
      }),
    )
  }

  const createNewChat = () => {
    const newId = Date.now().toString()
    const newConversation = {
      id: newId,
      title: "New Chat",
      messages: [],
    }

    setConversations([newConversation, ...conversations])
    setActiveConversation(newId)
    setChatHistory([])
    setUserInput("")
    setIsNamingChat(true)
    setNewChatName("")
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
    const conversation = conversations.find((conv) => conv.id === id)
    if (conversation) {
      setChatHistory(conversation.messages)
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }

  const deleteConversation = (id, e) => {
    e.stopPropagation()
    const updatedConversations = conversations.filter((conv) => conv.id !== id)
    setConversations(updatedConversations)

    if (id === activeConversation && updatedConversations.length > 0) {
      switchConversation(updatedConversations[0].id)
    } else if (updatedConversations.length === 0) {
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
    if (!userInput.trim() || isLoading || isNamingChat) return

    const userMessage = { sender: "user", text: userInput }
    // Add user message to chat history
    setChatHistory((prevHistory) => [...prevHistory, userMessage])

    // Update conversations with user message
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation) {
          const updatedMessages = [...conv.messages, userMessage]
          // Update title if needed
          let title = conv.title
          if (title === "New Chat" && updatedMessages.length === 1) {
            title = userMessage.text.slice(0, 30) + (userMessage.text.length > 30 ? "..." : "")
          }
          return { ...conv, messages: updatedMessages, title }
        }
        return conv
      }),
    )

    setUserInput("")
    setIsLoading(true)

    try {
      const apiKey = process.env.REACT_APP_API_KEY
      if (!apiKey) {
        console.error("API key is missing. Check your .env file.")
        const errorMessage = { sender: "bot", text: "API key missing. Please check your environment configuration." }
        setChatHistory((prevHistory) => [...prevHistory, errorMessage])
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return { ...conv, messages: [...conv.messages, errorMessage] }
            }
            return conv
          }),
        )
        setIsLoading(false)
        return
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userInput }] }],
          }),
        },
      )

      if (!response.ok) {
        console.error("API error:", response.status, response.statusText)
        const errorMessage = { sender: "bot", text: `API error: ${response.status}. Please try again later.` }
        setChatHistory((prevHistory) => [...prevHistory, errorMessage])
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return { ...conv, messages: [...conv.messages, errorMessage] }
            }
            return conv
          }),
        )
        setIsLoading(false)
        return
      }

      const data = await response.json()

      // Ensure response structure is correct
      if (!data || !data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        const errorMessage = { sender: "bot", text: "Invalid response from API. Please try again." }
        setChatHistory((prevHistory) => [...prevHistory, errorMessage])
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation) {
              return { ...conv, messages: [...conv.messages, errorMessage] }
            }
            return conv
          }),
        )
        setIsLoading(false)
        return
      }

      // Clean and format the response
      const rawResponse = data.candidates[0].content.parts[0].text
      const formattedResponse = rawResponse
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Convert **bold** to <strong>
        .replace(/\*(.*?)\*/g, "<em>$1</em>") // Convert *italic* to <em>
        .replace(/```([a-z]*)\n([\s\S]*?)```/g, (_, lang, code) => {
          const highlightedCode = hljs.highlightAuto(code).value
          return `<pre class="bg-gray-900 text-white p-4 rounded-md overflow-x-auto"><code class="hljs">${highlightedCode}</code></pre>`
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
    if (e.key === "Enter" && !e.shiftKey && !isNamingChat) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-[#0a0a0f]" : "bg-gray-50"}`}
    >
      {/* Navigation Menu */}
      <aside
        className={`${isDarkMode ? "bg-[#111827]/90" : "bg-white/90"} backdrop-blur-lg text-gray-300 w-72 p-4 shadow-2xl transform ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        } transition-all duration-300 fixed h-full z-30 border-r ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>Menu</h2>
          <button
            onClick={toggleMenu}
            className={`p-2 rounded-full ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition-colors`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-2">
          <Link
            to="/"
            className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? "text-gray-300 hover:bg-gray-800 hover:text-cyan-400"
                : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Home
          </Link>
          <Link
            to="/Support"
            className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? "text-gray-300 hover:bg-gray-800 hover:text-cyan-400"
                : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Support
          </Link>

          <div className="pt-6 pb-2">
            <div className={`border-t ${isDarkMode ? "border-gray-800" : "border-gray-200"} my-4`}></div>
            <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Preferences
            </h3>
          </div>

          <button
            onClick={toggleTheme}
            className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ${
              isDarkMode
                ? "text-gray-300 hover:bg-gray-800 hover:text-cyan-400"
                : "text-gray-700 hover:bg-gray-100 hover:text-cyan-600"
            }`}
          >
            {isDarkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </nav>
      </aside>

      {/* Chat History Sidebar */}
      <aside
        className={`${isDarkMode ? "bg-[#111827]/90" : "bg-white/90"} backdrop-blur-lg text-gray-300 w-80 shadow-2xl fixed h-full z-20 transition-all duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } border-r ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>Chat History</h2>
            <div className="flex space-x-2">
              <button
                onClick={toggleSidebar}
                className={`p-2 rounded-full md:hidden ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition-colors`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={toggleMenu}
                className={`p-2 rounded-full ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition-colors`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={createNewChat}
            className={`w-full mb-6 px-4 py-3 ${
              isDarkMode ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-gradient-to-r from-cyan-600 to-blue-700"
            } text-white rounded-lg hover:opacity-90 transition-opacity duration-200 flex items-center justify-center shadow-lg`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => switchConversation(conv.id)}
                className={`p-3 mb-2 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 ${
                  conv.id === activeConversation
                    ? isDarkMode
                      ? "bg-gray-800 text-white shadow-md"
                      : "bg-gray-200 text-gray-900 shadow-md"
                    : isDarkMode
                      ? "hover:bg-gray-800/70 text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="truncate flex-grow flex items-center">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-300"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <div className="truncate">
                    <div
                      className={`font-medium ${
                        conv.id === activeConversation
                          ? isDarkMode
                            ? "text-white"
                            : "text-gray-900"
                          : isDarkMode
                            ? "text-gray-300"
                            : "text-gray-700"
                      }`}
                    >
                      {conv.title}
                    </div>
                    <div className={`text-xs truncate ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {conv.messages.length > 0
                        ? `${conv.messages.length} message${conv.messages.length > 1 ? "s" : ""}`
                        : "No messages yet"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDarkMode
                      ? "text-gray-400 hover:bg-gray-700 hover:text-red-400"
                      : "text-gray-500 hover:bg-gray-200 hover:text-red-500"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
            <div
              className={`flex items-center p-3 rounded-lg ${
                isDarkMode ? "bg-gray-800/50 text-gray-300" : "bg-gray-100 text-gray-700"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium">CodeSync AI</div>
                <div className="text-xs text-gray-400">Powered by Gemini</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-grow flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-80" : "ml-0"}`}>
        <header
          className={`py-4 ${
            isDarkMode ? "bg-gradient-to-r from-[#111827] to-[#0a0a0f]" : "bg-white"
          } shadow-md z-10 sticky top-0 backdrop-blur-lg ${isDarkMode ? "bg-opacity-80" : "bg-opacity-80"}`}
        >
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={toggleSidebar}
                  className={`mr-4 p-2 rounded-full ${
                    isDarkMode
                      ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  } transition-colors`}
                >
                  {isSidebarOpen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  )}
                </button>
                <div className="shrink-0">
                  <Link
                    to="/"
                    title="Home"
                    className={`flex text-3xl font-bold ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                  >
                    CodeSync
                  </Link>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full ${
                    isDarkMode
                      ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } transition-colors`}
                >
                  {isDarkMode ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col relative">
          <div className={`flex-grow ${isDarkMode ? "bg-[#0a0a0f]" : "bg-gray-50"} p-6 flex flex-col overflow-hidden`}>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar" ref={chatContainerRef}>
              {chatHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className={`text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {isNamingChat ? (
                      <div
                        className={`${
                          isDarkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white border border-gray-200"
                        } p-8 rounded-2xl shadow-xl max-w-md mx-auto backdrop-blur-sm`}
                      >
                        <div
                          className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
                            isDarkMode ? "bg-gray-700" : "bg-gray-100"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-8 w-8 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </div>
                        <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                          Name your chat
                        </h3>
                        <p className={`mb-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                          Give this conversation a name to help you find it later.
                        </p>
                        <div className="relative mb-6">
                          <input
                            type="text"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            onKeyDown={handleNameKeyPress}
                            placeholder="Enter chat name..."
                            className={`w-full px-4 py-3 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
                            } border rounded-lg focus:outline-none focus:ring-2 ${
                              isDarkMode ? "focus:ring-cyan-500" : "focus:ring-cyan-600"
                            } transition-all duration-200`}
                            autoFocus
                          />
                          {newChatName && (
                            <button
                              onClick={() => setNewChatName("")}
                              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                                isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => setIsNamingChat(false)}
                            className={`px-4 py-2 rounded-lg ${
                              isDarkMode
                                ? "bg-gray-700 text-white hover:bg-gray-600"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                            } transition-colors`}
                          >
                            Skip
                          </button>
                          <button
                            onClick={saveChatName}
                            className={`px-4 py-2 rounded-lg ${
                              !newChatName.trim() ? "opacity-50 cursor-not-allowed " : "hover:opacity-90 "
                            }${
                              isDarkMode
                                ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                                : "bg-gradient-to-r from-cyan-600 to-blue-700"
                            } text-white transition-all duration-200`}
                            disabled={!newChatName.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="transform transition-all duration-300 hover:scale-105">
                        <div
                          className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                            isDarkMode ? "bg-gray-800" : "bg-white"
                          } shadow-lg`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-12 w-12 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                            />
                          </svg>
                        </div>
                        <h3 className={`text-2xl font-bold mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Start a new conversation
                        </h3>
                        <p className={`text-lg ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Type a message below to begin chatting with CodeSync AI
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-2">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                      {message.sender !== "user" && (
                        <div
                          className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 ${
                            isDarkMode ? "bg-gray-800" : "bg-gray-200"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-xl px-5 py-3.5 rounded-2xl ${
                          message.sender === "user"
                            ? isDarkMode
                              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white self-end"
                              : "bg-gradient-to-r from-cyan-600 to-blue-700 text-white self-end"
                            : isDarkMode
                              ? "bg-gray-800 text-gray-300 self-start"
                              : "bg-white text-gray-800 self-start border border-gray-200"
                        } shadow-md`}
                        style={{
                          fontSize: "16px",
                          lineHeight: "1.6",
                          wordBreak: "break-word",
                          maxWidth: "75%",
                        }}
                      >
                        {message.sender === "user" ? (
                          <div>{message.text}</div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: message.text }} />
                        )}
                      </div>
                      {message.sender === "user" && (
                        <div
                          className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ml-3 ${
                            isDarkMode ? "bg-gray-800" : "bg-gray-200"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 ${
                          isDarkMode ? "bg-gray-800" : "bg-gray-200"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div
                        className={`px-5 py-3.5 rounded-2xl shadow-md ${
                          isDarkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-800 border border-gray-200"
                        }`}
                      >
                        <div className="flex space-x-2">
                          <div
                            className={`w-2 h-2 ${isDarkMode ? "bg-cyan-400" : "bg-cyan-600"} rounded-full animate-bounce`}
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className={`w-2 h-2 ${isDarkMode ? "bg-cyan-400" : "bg-cyan-600"} rounded-full animate-bounce`}
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className={`w-2 h-2 ${isDarkMode ? "bg-cyan-400" : "bg-cyan-600"} rounded-full animate-bounce`}
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Input Bar */}
          <div
            className={`${
              isDarkMode ? "bg-[#111827]/90 border-t border-gray-800" : "bg-white/90 border-t border-gray-200"
            } backdrop-blur-lg p-4 sticky bottom-0 left-0 right-0 shadow-lg z-10`}
          >
            <div className="max-w-4xl mx-auto">
              <div className="relative flex rounded-xl shadow-xl">
                <textarea
                  ref={textareaRef}
                  placeholder={isNamingChat ? "Please name your chat first..." : "Type your message..."}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className={`flex-grow px-5 py-4 ${
                    isDarkMode
                      ? "bg-gray-800/90 border-gray-700 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } border rounded-l-xl focus:outline-none focus:ring-2 ${
                    isDarkMode ? "focus:ring-cyan-500" : "focus:ring-cyan-600"
                  } resize-none transition-all duration-200 text-base font-medium shadow-inner`}
                  rows={1}
                  style={{ minHeight: "60px", maxHeight: "150px" }}
                  disabled={isNamingChat}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !userInput.trim() || isNamingChat}
                  className={`px-5 py-2 rounded-r-xl flex items-center justify-center transition-all duration-200 ${
                    isLoading || !userInput.trim() || isNamingChat
                      ? "opacity-50 cursor-not-allowed "
                      : "hover:opacity-90 "
                  }${
                    isDarkMode
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                      : "bg-gradient-to-r from-cyan-600 to-blue-700"
                  } text-white`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
              <p className={`text-sm mt-2 text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {isNamingChat ? "Enter a name for your chat" : "Press Enter to send, Shift+Enter for a new line"}
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Add custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? "rgba(31, 41, 55, 0.1)" : "rgba(243, 244, 246, 0.1)"};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? "rgba(75, 85, 99, 0.8)" : "rgba(209, 213, 219, 0.8)"};
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? "rgba(107, 114, 128, 0.8)" : "rgba(156, 163, 175, 0.8)"};
        }
      `}</style>
    </div>
  )
}

