"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  generatedImage?: string | null;
  isGeneratingImage?: boolean;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  generatedImage,
  isGeneratingImage,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white min-h-0 rounded-xl overflow-hidden">
      <div className="relative flex-1 min-h-0">
        <div className="absolute top-3 right-3 z-10 flex space-x-2">
          <button
            onClick={handleCopyTranscript}
            className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-full transition-all duration-300 ${justCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{justCopied ? "Copied!" : "Copy"}</span>
          </button>
        </div>

        <div
          ref={transcriptRef}
          className="overflow-auto p-6 flex flex-col gap-y-4 h-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {transcriptItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm max-w-md">Ask me about what kind of image you'd like to create, and I'll help you generate it with AI.</p>
            </div>
          )}

          {transcriptItems.map((item) => {
            const { itemId, type, role, data, expanded, timestamp, title = "", isHidden } = item;

            if (isHidden) {
              return null;
            }
            
            // Check if this message contains an image
            const hasImage = data && data.imageUrl;

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const baseContainer = "flex justify-end flex-col";
              const containerClasses = `${baseContainer} ${isUser ? "items-end" : "items-start"}`;
              const bubbleBase = `max-w-lg p-3 rounded-2xl shadow-sm ${isUser ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white" : "bg-gray-100 text-black border border-gray-200"}`;
              const isBracketedMessage = title.startsWith("[") && title.endsWith("]");
              const messageStyle = isBracketedMessage ? "italic text-gray-400" : "";
              const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;

              return (
                <div key={itemId} className={containerClasses}>
                  <div className={`flex items-center mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold mr-1">
                        AI
                      </div>
                    )}
                    <div className={`text-xs ${isUser ? "text-gray-500" : "text-gray-500"} font-mono`}>
                      {timestamp}
                    </div>
                    {isUser && (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold ml-1">
                        You
                      </div>
                    )}
                  </div>
                  <div className={bubbleBase}>
                    <div className={`whitespace-pre-wrap ${messageStyle}`}>
                      <ReactMarkdown>{displayTitle}</ReactMarkdown>
                    </div>
                    
                    {/* Display image if this message contains one */}
                    {hasImage && (
                      <div className="mt-4 w-full max-w-[600px]">
                        <div className="relative group mt-2">
                          <img 
                            src={data.imageUrl} 
                            alt="Generated image" 
                            className="w-full rounded-lg shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl" 
                            onError={(e) => {
                              console.error('Image failed to load:', data.imageUrl);
                              const target = e.target as HTMLImageElement;
                              target.onerror = null; // Prevent infinite loops
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0yNCAxMGMwLTUuNTIzLTQuNDc3LTEwLTEwLTEwcy0xMCA0LjQ3Ny0xMCAxMGMwIDUuNTIzIDQuNDc3IDEwIDEwIDEwczEwLTQuNDc3IDEwLTEwem0tMTEgNWgtMnYtMTBoMnY0aDZ2LTRoMnYxMGgtMnYtNGgtNnY0eiIvPjwvc3ZnPg==';
                              target.alt = 'Image failed to load';
                              target.className = 'w-full h-64 object-contain bg-gray-100 rounded-lg border border-red-300';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-end justify-center">
                            <div className="p-4 text-white text-center w-full">
                              <a 
                                href={data.imageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors duration-300"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                View Full Size
                              </a>
                            </div>
                          </div>
                        </div>
                        {/* Display the prompt underneath the image */}
                        {data.imagePrompt && (
                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="font-semibold">Prompt:</span> {data.imagePrompt}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show loading indicator if image is being generated - ChatGPT style */}
                    {isGeneratingImage && role === 'assistant' && title.includes('creating') && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="w-full max-w-[400px] aspect-square bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-4">
                          {/* Grid of squares animation */}
                          <div className="grid grid-cols-4 gap-2 w-32 h-32">
                            {Array.from({ length: 16 }).map((_, index) => (
                              <div 
                                key={index}
                                className={`bg-purple-400 rounded-sm opacity-40 animate-pulse`}
                                style={{
                                  animationDelay: `${index * 0.1}s`,
                                  animationDuration: '1.5s'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center">
                          <div className="animate-pulse mr-2 h-2 w-2 bg-purple-500 rounded-full"></div>
                          <p className="text-gray-600 font-medium">Creating your image...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-start items-start text-gray-500 text-sm my-2 py-2 border-t border-b border-gray-100"
                >
                  <span className="text-xs font-mono text-gray-400">{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-medium text-sm text-gray-600 ${
                      data ? "cursor-pointer hover:text-purple-600 transition-colors duration-200" : ""
                    }`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
                  >
                    {data && (
                      <span
                        className={`text-purple-500 mr-1 transform transition-transform duration-200 select-none ${
                          expanded ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    {title}
                  </div>
                  {expanded && data && (
                    <div className="text-gray-800 text-left w-full mt-2 bg-gray-50 rounded-lg">
                      <pre className="border-l-2 border-purple-300 whitespace-pre-wrap break-words font-mono text-xs p-3 overflow-x-auto">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            } else {
              // Fallback if type is neither MESSAGE nor BREADCRUMB
              return (
                <div
                  key={itemId}
                  className="flex justify-center text-gray-500 text-sm italic font-mono bg-gray-50 p-2 rounded-lg"
                >
                  Unknown item type: {type}{" "}
                  <span className="ml-2 text-xs">{timestamp}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="p-4 flex items-center gap-x-3 flex-shrink-0 border-t border-gray-200 bg-gray-50">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm"
          placeholder="Describe the image you want to create..."
          disabled={!canSend}
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white rounded-full p-3 disabled:opacity-50 transition-all duration-300 shadow-md hover:shadow-lg"
          title={canSend ? "Send message" : "Connect to start conversation"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Transcript;
