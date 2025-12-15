import React, { useRef, useEffect, useState } from "react";
import { ArrowUp, Globe, Paperclip, Sun, Moon } from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "../context/ThemeProvider";

function Prompt({ 
  prompt, 
  setPrompt, 
  currentChatId, 
  setCurrentChatId,
  setChatTitle,
  fetchChatHistory 
}) {
  const [inputValue, setInputValue] = useState("");
  const [typeMessage, setTypeMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const promptEndRef = useRef();

  useEffect(() => {
    promptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [prompt, loading]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    setTypeMessage(trimmed);
    setInputValue("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:4002/api/v1/aiTool/prompt",
        { 
          content: trimmed,
          chatId: currentChatId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      
      const newPrompt = [
        ...prompt,
        { role: "user", content: trimmed },
        { role: "assistant", content: data.reply },
      ];
      
      setPrompt(newPrompt);
      
      if (!currentChatId && data.chatId) {
        setCurrentChatId(data.chatId);
        if (newPrompt.length === 2) {
          const title = trimmed.length > 30 
            ? trimmed.substring(0, 30) + "..." 
            : trimmed;
          setChatTitle(data.chatId, title);
        }
      }
      
      setTimeout(() => {
        fetchChatHistory();
      }, 500);
      
    } catch (error) {
      const newPrompt = [
        ...prompt,
        { role: "user", content: trimmed },
        { role: "assistant", content: "Something went wrong with AI response" },
      ];
      setPrompt(newPrompt);
    } finally {
      setLoading(false);
      setTypeMessage(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar with Theme Toggle */}
      <div className={`flex justify-end px-6 py-3 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#1B1717]' : 'bg-[#FCF8F8]'
      }`}>
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            theme === 'dark' 
              ? 'bg-[#810000] hover:bg-[#630000] text-[#EEEBDD]' // Dark red button
              : 'bg-[#FBEFEF] hover:bg-[#F9DFDF] text-gray-700'
          }`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4" />
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Greeting or Chat */}
      <div className="flex-1 overflow-hidden">
        {prompt.length === 0 ? (
          // Greeting Section
          <div className="h-full flex items-center justify-center">
            <div className="text-center w-full max-w-4xl px-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-[#810000] to-[#630000]' // Red gradient
                    : 'bg-gradient-to-r from-[#F5AFAF] to-[#F9DFDF]'
                }`}>
                  <span className="text-white font-bold text-xl">GS</span>
                </div>
                <h1 className={`text-3xl font-semibold ${
                  theme === 'dark' ? 'text-[#EEEBDD]' : 'text-gray-900'
                }`}>
                  Hi, I'm GyaanSeek
                </h1>
              </div>
              <p className={`text-lg ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                How can I help you?
              </p>
            </div>
          </div>
        ) : (
          // Chat Section
          <div className="h-full overflow-y-auto  ml-2">
            <div className="w-full max-w-4xl mx-auto px-4">
              {prompt.map((msg, index) => (
                <div
                  key={index}
                  className={`flex mt-4 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className={`max-w-[100%] rounded-xl px-4 py-3 mt-2 text-sm whitespace-pre-wrap transition-colors duration-300 ${
                      theme === 'dark' 
                        ? 'bg-[#2D2D2D] text-[#EEEBDD] border border-[#630000]' // Dark gray with cream text
                        : 'bg-[#FBEFEF] text-gray-900 border border-[#F9DFDF]'
                    }`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={codeTheme}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg mt-2"
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code
                                className={`px-1 py-0.5 rounded ${
                                  theme === 'dark' 
                                    ? 'bg-[#1B1717] text-[#EEEBDD]' 
                                    : 'bg-[#F9DFDF] text-gray-800'
                                }`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap transition-colors duration-300 ${
                      theme === 'dark' 
                        ? 'bg-[#810000] text-[#EEEBDD]' // Dark red user messages
                        : 'bg-[#F5AFAF] text-white'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
              {loading && typeMessage && (
                <div className="flex justify-end">
                  <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap transition-colors duration-300 ${
                    theme === 'dark' 
                      ? 'bg-[#810000] text-[#EEEBDD]' 
                      : 'bg-[#F5AFAF] text-white'
                  }`}>
                    {typeMessage}
                  </div>
                </div>
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-xl text-sm animate-pulse transition-colors duration-300 ${
                    theme === 'dark' 
                      ? 'bg-[#2D2D2D] text-[#EEEBDD] border border-[#630000]' 
                      : 'bg-[#FBEFEF] text-gray-900 border border-[#F9DFDF]'
                  }`}>
                    Loading...
                  </div>
                </div>
              )}
              <div ref={promptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className={`py-6 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#1B1717]' : 'bg-[#FCF8F8]'
      }`}>
        <div className="w-full max-w-4xl mx-auto px-4">
          <div className={`rounded-2xl px-6 py-6 shadow-lg transition-colors duration-300 ${
            theme === 'dark' 
              ? 'bg-[#2D2D2D] border border-[#630000]' // Dark gray with dark red border
              : 'bg-white border border-[#F9DFDF]'
          }`}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message GyaanSeek"
              className={`bg-transparent w-full placeholder-gray-400 text-lg outline-none resize-none transition-colors duration-300 ${
                theme === 'dark' ? 'text-[#EEEBDD]' : 'text-gray-900'
              }`}
              rows="1"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            <div className="flex items-center justify-between mt-4 gap-4">
              <div className="flex">
                <button className={`flex items-center gap-2 border text-base px-3 py-1.5 rounded-full transition-colors duration-300 ${
                  theme === 'dark' 
                    ? 'border-[#630000] text-[#EEEBDD] hover:bg-[#630000]' 
                    : 'border-[#F9DFDF] text-gray-700 hover:bg-[#FBEFEF]'
                }`}>
                  <Globe className="w-5 h-4" />
                  Search
                </button>
              </div>
              <div className="flex items-center gap-2">
                
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || loading}
                  className={`transition-colors duration-300 p-2 rounded-full text-white ${
                    inputValue.trim() && !loading
                      ? theme === 'dark'
                        ? "bg-[#810000] hover:bg-[#630000]"
                        : "bg-[#F5AFAF] hover:bg-[#F9DFDF]"
                      : theme === 'dark'
                        ? "bg-[#2D2D2D] cursor-not-allowed border border-[#630000]"
                        : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Prompt;