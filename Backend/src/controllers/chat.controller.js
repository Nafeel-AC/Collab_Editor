import fetch from 'node-fetch';
import ChatConversation from '../models/chat.model.js';

// Chat with Gemini API
export const chatWithGemini = async (req, res) => {
  try {
    const { messages, conversationId } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required" });
    }
    
    console.log(`Chatting with Gemini...`);
    
    // Check for user authentication - extract from Authorization header if not set by middleware
    let userId = req.userId;
    if (!userId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.default.verify(token, process.env.JWT_ACCESS_SECRET);
          userId = decoded.userId;
          console.log(`Extracted userId from token: ${userId}`);
        }
      } catch (error) {
        console.log("Error extracting userId from token:", error.message);
        // Continue without userId - won't persist messages
      }
    }
    
    // Use the Google Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }
    
    // Create a proper request format for Gemini API
    const geminiMessages = messages.map(msg => ({
      role: msg.role,
      parts: msg.parts
    }));
    
    // Make the API call to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res.status(500).json({ 
        message: "Failed to chat with Gemini",
        error: errorText 
      });
    }
    
    const data = await response.json();
    console.log("Chat response received from Gemini");
    
    // If there's a logged-in user and a conversation ID, save the messages to the database
    if (userId && conversationId) {
      try {
        console.log(`Saving chat messages to conversation ${conversationId} for user ${userId}`);
        
        // Find the conversation
        const conversation = await ChatConversation.findOne({ 
          _id: conversationId,
          userId: userId
        });
        
        if (conversation) {
          // Extract the latest user message
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === 'user') {
            // Add the user message to the conversation
            conversation.messages.push({
              sender: 'user',
              text: userMessage.parts[0].text
            });
            
            // If we got a valid response from Gemini, add the bot's message too
            if (data.candidates && data.candidates.length > 0 && 
                data.candidates[0].content && data.candidates[0].content.parts && 
                data.candidates[0].content.parts.length > 0) {
              
              const botResponse = data.candidates[0].content.parts[0].text;
              
              // Add the bot message to the conversation
              conversation.messages.push({
                sender: 'bot',
                text: botResponse
              });
            }
            
            // Save the updated conversation
            await conversation.save();
            console.log(`Saved messages to conversation ${conversationId}`);
            
            // Add the saved flag to the response
            data._meta = { 
              saved: true,
              messagesSaved: 2 // User message + bot response
            };
          }
        } else {
          console.log(`Conversation ${conversationId} not found for user ${userId}`);
          data._meta = { saved: false, reason: "conversation_not_found" };
        }
      } catch (error) {
        console.error("Error saving chat messages to database:", error);
        data._meta = { saved: false, reason: "database_error" };
        // Continue even if saving to DB fails - we don't want to break the chat flow
      }
    } else {
      console.log("Not saving chat history: user not authenticated or no conversation ID");
      data._meta = { saved: false, reason: userId ? "no_conversation_id" : "no_user_id" };
    }
    
    // Return the Gemini response to the client with the metadata
    res.status(200).json(data);
  } catch (error) {
    console.error("Error chatting with Gemini:", error);
    res.status(500).json({ 
      message: "Failed to chat with Gemini",
      error: error.message 
    });
  }
};

// Get all conversations for the authenticated user
export const getConversations = async (req, res) => {
  try {
    console.log('Fetching conversations for user:', req.userId);
    
    // Make sure user is properly authenticated
    if (!req.userId) {
      console.log('User not properly authenticated, userId missing');
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const conversations = await ChatConversation.find({ userId: req.userId })
      .select('_id title createdAt updatedAt')
      .sort({ updatedAt: -1 });
    
    console.log(`Found ${conversations.length} conversations for user ${req.userId}`);
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ 
      message: "Failed to fetch conversations",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get a specific conversation by ID
export const getConversationById = async (req, res) => {
  try {
    console.log(`Fetching conversation ${req.params.id} for user ${req.userId}`);
    
    const conversation = await ChatConversation.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ 
      message: "Failed to fetch conversation",
      error: error.message 
    });
  }
};

// Create a new conversation
export const createConversation = async (req, res) => {
  try {
    const { title = "New Chat", initialMessage } = req.body;
    
    console.log(`Creating new conversation for user ${req.userId}`);
    
    const conversation = new ChatConversation({
      userId: req.userId,
      title,
      messages: initialMessage ? [{
        sender: 'user',
        text: initialMessage
      }] : []
    });
    
    await conversation.save();
    console.log(`New conversation created with ID: ${conversation._id}`);
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ 
      message: "Failed to create conversation",
      error: error.message 
    });
  }
};

// Update a conversation's title
export const updateConversationTitle = async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    
    console.log(`Updating title for conversation ${req.params.id}`);
    
    const conversation = await ChatConversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    console.log(`Title updated for conversation ${req.params.id}`);
    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error updating conversation title:", error);
    res.status(500).json({ 
      message: "Failed to update conversation title",
      error: error.message 
    });
  }
};

// Delete a conversation
export const deleteConversation = async (req, res) => {
  try {
    console.log(`Deleting conversation ${req.params.id}`);
    
    const result = await ChatConversation.deleteOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    console.log(`Conversation ${req.params.id} deleted successfully`);
    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ 
      message: "Failed to delete conversation",
      error: error.message 
    });
  }
};

// Add a message to a conversation
export const addMessageToConversation = async (req, res) => {
  try {
    const { text, sender = 'user' } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: "Message text is required" });
    }
    
    console.log(`Adding message to conversation ${req.params.id}`);
    
    const conversation = await ChatConversation.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    conversation.messages.push({
      sender,
      text
    });
    
    await conversation.save();
    console.log(`Message added to conversation ${req.params.id}`);
    
    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error adding message to conversation:", error);
    res.status(500).json({ 
      message: "Failed to add message",
      error: error.message 
    });
  }
}; 