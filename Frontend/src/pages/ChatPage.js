"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function ChatPage() {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [message, setMessage] = useState("");
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    useEffect(() => {
        if (user) {
            fetchChats();
        }
    }, [user]);

    const fetchChats = async () => {
        try {
            const response = await axios.get("/api/chat");
            setChats(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async () => {
        if (!activeChat || !message.trim()) return;

        try {
            await axios.post("/api/chat/send", {
                recipientId: activeChat.participants.find((p) => p._id !== user._id)._id,
                text: message,
            });
            setMessage("");
            fetchChats();
        } catch (error) {
            console.error(error);
        }
    };

    if (!user) {
        return <div>Please log in to access the chat system.</div>;
    }

    return (
        <div>
            <h1>Chat System</h1>
            <div>
                <h2>Chats</h2>
                {chats.map((chat) => (
                    <div key={chat._id} onClick={() => setActiveChat(chat)}>
                        <span>
                            Chat with{" "}
                            {chat.participants.find((p) => p._id !== user._id).userName}
                        </span>
                    </div>
                ))}
            </div>
            {activeChat && (
                <div>
                    <h2>Chat</h2>
                    <div>
                        {activeChat.messages.map((msg, index) => (
                            <div key={index}>
                                <strong>{msg.sender.userName}:</strong> {msg.text}
                            </div>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            )}
        </div>
    );
}
