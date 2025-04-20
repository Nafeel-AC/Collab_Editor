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
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-gray-200 overflow-hidden">
      {/* Sidebar with glowing border */}
      <aside
        className={`fixed h-full z-30 transition-all duration-300 backdrop-blur-md 
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          w-80 bg-black/60 border-r border-gray-700/30 shadow-[1px_0_20px_rgba(192,192,192,0.2)]`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-silver to-gray-300">
              Conversations
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-full bg-gray-800/40 text-gray-300 hover:bg-gray-700/60 transition-colors"
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
          </div>

          <button
            onClick={createNewChat}
            className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-400 hover:to-gray-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]"
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
            New Conversation
          </button>

          <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
            {/* Conversation list */}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => switchConversation(conv.id)}
                className={`p-3 mb-2 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 
                  ${conv.id === activeConversation
                    ? "bg-gradient-to-r from-gray-700/80 to-gray-800/80 border border-gray-600/40 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                    : "hover:bg-gray-800/40 border border-transparent"
                  }`}
              >
                <div className="truncate flex-grow flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mr-3 border border-gray-600/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-300"
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
                    <div className="font-medium text-gray-300">
                      {conv.title}
                    </div>
                    <div className="text-xs truncate text-gray-500">
                      {conv.messages.length > 0
                        ? `${conv.messages.length} message${conv.messages.length > 1 ? "s" : ""}`
                        : "No messages yet"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:bg-gray-700 hover:text-red-400"
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
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-grow flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-80" : "ml-0"}`}>
        {/* Header */}
        <header className="py-3 backdrop-blur-xl bg-black/30 border-b border-gray-700/30 shadow-[0_4px_15px_rgba(0,0,0,0.3)] z-10 sticky top-0">
          <div className="px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={toggleSidebar}
                  className="mr-4 p-2 rounded-full bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white transition-colors"
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
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  )}
                </button>
                <div className="shrink-0">
                  <Link
                    to="/home"
                    title="Home"
                    className="flex text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-silver to-gray-300"
                  >
                    <span className="relative">
                      CodeSync AI
                      <span className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat area */}
        <main className="flex-grow flex flex-col relative">
          <div className="flex-grow p-6 flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 to-black relative">
            {/* Ambient background effect */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '8s' }}></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '10s' }}></div>
            </div>
            
            {/* Chat messages */}
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar relative z-10" ref={chatContainerRef}>
              {chatHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    {isNamingChat ? (
                      <div className="bg-black/60 border border-gray-700/50 p-8 rounded-2xl shadow-2xl max-w-md mx-auto backdrop-blur-sm">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-gray-300"
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
                        <h3 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-silver to-gray-300">
                          Name your conversation
                        </h3>
                        <p className="mb-6 text-gray-400">
                          Give this conversation a name to help you find it later.
                        </p>
                        <div className="relative mb-6">
                          <input
                            type="text"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            onKeyDown={handleNameKeyPress}
                            placeholder="Enter conversation name..."
                            className="w-full px-4 py-3 bg-gray-800/60 border border-gray-600/50 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent shadow-inner transition-all duration-200"
                            autoFocus
                          />
                          {newChatName && (
                            <button
                              onClick={() => setNewChatName("")}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-200"
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
                            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                          >
                            Skip
                          </button>
                          <button
                            onClick={saveChatName}
                            className={`px-4 py-2 rounded-lg ${
                              !newChatName.trim() ? "opacity-50 cursor-not-allowed " : "hover:opacity-90 "
                            } bg-gradient-to-r from-gray-500 to-gray-700 text-white shadow-lg transition-all duration-200`}
                            disabled={!newChatName.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="transform transition-all duration-300 hover:scale-105">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30 shadow-[0_0_20px_rgba(192,192,192,0.2)]">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 text-gray-300"
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
                        <h3 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-silver to-gray-300">
                          Start a new conversation
                        </h3>
                        <p className="text-lg text-gray-400">
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
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30 shadow-md">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-300"
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
                        className={`max-w-xl px-5 py-3.5 rounded-2xl shadow-md ${
                          message.sender === "user"
                            ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white border border-gray-500/30 shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
                            : "bg-black/60 text-gray-300 border border-gray-700/50 backdrop-blur-sm"
                        }`}
                        style={{ fontSize: "16px", lineHeight: "1.6", wordBreak: "break-word", maxWidth: "75%" }}
                      >
                        {message.sender === "user" ? (
                          <div>{message.text}</div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: message.text }} />
                        )}
                      </div>
                      {message.sender === "user" && (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ml-3 bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30 shadow-md">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-gray-300"
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
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-3 bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30 shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-300"
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
                      <div className="px-5 py-3.5 rounded-2xl shadow-md bg-black/60 text-gray-300 border border-gray-700/50 backdrop-blur-sm">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-gray-800 sticky bottom-0 left-0 right-0 z-10 backdrop-blur-md bg-black/50">
            <div className="max-w-4xl mx-auto">
              <div className="relative flex rounded-xl">
                <textarea
                  ref={textareaRef}
                  placeholder={isNamingChat ? "Please name your conversation first..." : "Type your message..."}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-grow px-5 py-4 bg-gray-800/70 border border-gray-700/50 text-white placeholder-gray-500 rounded-l-xl focus:outline-none focus:ring-1 focus:ring-gray-500 resize-none transition-all duration-200 text-base shadow-inner"
                  rows={1}
                  style={{ minHeight: "60px", maxHeight: "150px" }}
                  disabled={isNamingChat}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !userInput.trim() || isNamingChat}
                  className={`px-5 py-2 rounded-r-xl flex items-center justify-center transition-all duration-200 
                    ${isLoading || !userInput.trim() || isNamingChat
                      ? "opacity-50 cursor-not-allowed "
                      : "hover:opacity-90 "
                    } bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white border-t border-r border-b border-gray-700/50`}
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
              <p className="text-sm mt-2 text-center text-gray-500">
                {isNamingChat ? "Enter a name for your conversation" : "Press Enter to send, Shift+Enter for a new line"}
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Custom scrollbar and other styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.1);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(192, 192, 192, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(192, 192, 192, 0.5);
        }

        /* Add ambient light animation */
        @keyframes pulse-light {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

