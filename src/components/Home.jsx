import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { useTheme } from "../context/ThemeProvider";
import axios from "axios";
import Sidebar from "./Sidebar";
import Prompt from "./Prompt";

function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [authUser, setAuthUser] = useAuth();
  const [prompt, setPrompt] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const user = JSON.parse(localStorage.getItem("user"));


  
  // Load chat history on component mount
  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Add this useEffect in Home.jsx
useEffect(() => {
  console.log("Current token from localStorage:", localStorage.getItem("token"));
  console.log("Current user from localStorage:", localStorage.getItem("user"));
  
  // Test if token is valid
  if (localStorage.getItem("token")) {
    console.log("Token exists, checking format...");
    
    // Decode the token to check expiration
    const token = localStorage.getItem("token");
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log("Token payload:", payload);
      console.log("Token expires:", new Date(payload.exp * 1000));
      console.log("Current time:", new Date());
      console.log("Is token expired?", payload.exp * 1000 < Date.now());
    } catch (error) {
      console.error("Failed to parse token:", error);
    }
  }
}, []);

  // Store chat titles in localStorage
  const getChatTitle = (chatId) => {
    const titles = JSON.parse(localStorage.getItem('chatTitles') || '{}');
    return titles[chatId] || null;
  };

  const setChatTitle = (chatId, title) => {
    const titles = JSON.parse(localStorage.getItem('chatTitles') || '{}');
    titles[chatId] = title;
    localStorage.setItem('chatTitles', JSON.stringify(titles));
    
    // Update local state
    setChatHistory(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title } : chat
    ));
  };

  // Fetch ALL chats with pagination
  const fetchAllChats = async () => {
    try {
      const token = localStorage.getItem("token");
      let allChats = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        console.log(`Fetching page ${page} of chats...`);
        
        const { data } = await axios.get(
          "http://localhost:4002/api/v1/chat/chats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
            params: {
              limit: 50,
              page: page,
              sort: 'createdAt:desc'
            }
          }
        );
        
        if (data.success && data.chats && data.chats.length > 0) {
          allChats = [...allChats, ...data.chats];
          
          // If we got fewer chats than the limit, we've reached the end
          if (data.chats.length < 50) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      console.log(`Total chats fetched: ${allChats.length}`);
      return allChats;
    } catch (error) {
      console.error("Error fetching all chats:", error);
      return [];
    }
  };

  const fetchChatHistory = async () => {
    try {
      setLoadingHistory(true);
      
      // Fetch ALL chats, not just limited ones
      const allChats = await fetchAllChats();
      
      console.log("Processing", allChats.length, "chats...");
      
      // Process chats with titles
      const chatsWithTitles = await Promise.all(
        allChats.map(async (chat) => {
          let title = getChatTitle(chat.id);
          
          // If no title in localStorage, create one
          if (!title) {
            // Try to fetch the chat details to get the first message
            try {
              const token = localStorage.getItem("token");
              const { data } = await axios.get(
                `http://localhost:4002/api/v1/chat/chats/${chat.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  withCredentials: true,
                }
              );
              
              if (data.success && data.chat?.messages?.length > 0) {
                const firstUserMessage = data.chat.messages.find(msg => msg.role === 'user');
                if (firstUserMessage?.content) {
                  const words = firstUserMessage.content.trim().split(/\s+/);
                  title = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
                  
                  // Save to localStorage
                  const titles = JSON.parse(localStorage.getItem('chatTitles') || '{}');
                  titles[chat.id] = title;
                  localStorage.setItem('chatTitles', JSON.stringify(titles));
                }
              }
            } catch (error) {
              console.error(`Failed to fetch chat ${chat.id} details:`, error);
            }
          }
          
          return {
            ...chat,
            title: title || "New Chat"
          };
        })
      );
      
      console.log("Setting chat history with", chatsWithTitles.length, "chats");
      setChatHistory(chatsWithTitles);
      
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Rest of your component remains the same...
  const handleLogout = async () => {
    try {
      const { data } = await axios.get(
        "http://localhost:4002/api/v1/user/logout",
        {
          withCredentials: true,
        }
      );

      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem('chatTitles');

      alert(data.message);
      setAuthUser(null);
      navigate("/login");
    } catch (error) {
      alert(error?.response?.data?.errors || "Logout Failed");
    }
  };

  const handleNewChat = () => {
    setPrompt([]);
    setCurrentChatId(null);
  };

  const handleSelectChat = async (chatId) => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `http://localhost:4002/api/v1/chat/chats/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      
      if (data.success) {
        const formattedMessages = data.chat.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        setPrompt(formattedMessages);
        setCurrentChatId(chatId);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:4002/api/v1/chat/chats/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      
      // Remove title from localStorage
      const titles = JSON.parse(localStorage.getItem('chatTitles') || '{}');
      delete titles[chatId];
      localStorage.setItem('chatTitles', JSON.stringify(titles));
      
      // If current chat was deleted, clear it
      if (chatId === currentChatId) {
        setPrompt([]);
        setCurrentChatId(null);
      }
      
      await fetchChatHistory(); // Refresh the history
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const handleEditChatTitle = async (chatId, newTitle) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localhost:4002/api/v1/chat/chats/${chatId}/title`,
        { title: newTitle },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      
      // Save title to localStorage and update state
      setChatTitle(chatId, newTitle);
    } catch (error) {
      console.error("Failed to update chat title:", error);
    }
  };

  return (
    <div className={`flex h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-[#1B1717] text-[#EEEBDD]'
        : 'bg-[#FCF8F8] text-gray-900'
    }`}>
      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        user={user}
        handleLogout={handleLogout}
        onNewChat={handleNewChat}
        messageCount={prompt.length / 2}
        chatHistory={chatHistory}
        loadingHistory={loadingHistory}
        onSelectChat={handleSelectChat}
        currentChatId={currentChatId}
        onDeleteChat={handleDeleteChat}
        onEditChatTitle={handleEditChatTitle}
      />

      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        <Prompt 
          prompt={prompt} 
          setPrompt={setPrompt}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          setChatTitle={setChatTitle}
          fetchChatHistory={fetchChatHistory}
        />
      </div>
    </div>
  );
}

export default Home;