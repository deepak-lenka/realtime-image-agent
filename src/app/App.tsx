"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

// Types
import { AgentConfig, SessionStatus, TranscriptItem } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import ReactMarkdown from "react-markdown";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

function App() {
  const searchParams = useSearchParams();

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] =
    useState<AgentConfig[] | null>(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
  });

  // Handle tool calls for image generation
  const handleToolCall = useCallback((event: any) => {
    console.log('Event received:', event);
    
    // Handle function call from response.done event
    if (event.type === "response.done" && event.response?.output) {
      console.log('Processing response.done event with outputs:', event.response.output);
      event.response.output.forEach((outputItem: any) => {
        if (outputItem.type === "function_call" && 
            outputItem.name === "generateImage" && 
            outputItem.arguments) {
          try {
            console.log('Found generateImage function call in response.done');
            const args = JSON.parse(outputItem.arguments);
            processImageGeneration(args.prompt, outputItem.call_id);
          } catch (error) {
            console.error('Error parsing function call arguments:', error);
          }
        }
      });
    }
    
    // Handle direct tool_call event
    if (event.type === "tool_call" && 
        event.item?.name === "generateImage" && 
        event.item?.arguments) {
      try {
        console.log('Processing direct tool_call event for generateImage');
        const args = JSON.parse(event.item.arguments);
        processImageGeneration(args.prompt, event.item?.call_id);
      } catch (error) {
        console.error('Error parsing tool call arguments:', error);
      }
    }

    // Handle tool_call.response event for image generation
    if (event.type === "tool_call.response" && 
        event.call_id && 
        event.output?.image_url && 
        event.output?.prompt) {
      console.log('Processing tool_call.response for image generation:', event.output);
      // This ensures we catch the response with the image URL
      addImageToTranscript(event.output.image_url, event.output.prompt);
    }
  }, []);
  
  // Helper function to add image to transcript
  const addImageToTranscript = useCallback((imageUrl: string, prompt: string) => {
    console.log('Adding image to transcript:', imageUrl, prompt);
    // Create a unique ID for this message
    const messageId = uuidv4().slice(0, 32);
    // Add a visible message with the image
    addTranscriptMessage(messageId, 'assistant', 'Here is the image I created for you:', false, {
      imageUrl: imageUrl,
      imagePrompt: prompt
    });
    // Update UI state
    setGeneratedImage(imageUrl);
    setIsGeneratingImage(false);
    
    // Trigger a follow-up response from the AI to ask for feedback
    // Short timeout to ensure the image is displayed first
    setTimeout(() => {
      sendClientEvent(
        { type: "response.create" },
        "(trigger feedback response after image generation)"
      );
    }, 1000);
  }, [addTranscriptMessage, sendClientEvent]);

  // Separate function to process image generation
  const processImageGeneration = useCallback((prompt: string, callId?: string) => {
    console.log('Generating image with prompt:', prompt);
    setIsGeneratingImage(true);
    
    // First, add a message indicating we're generating an image
    const loadingMessageId = uuidv4().slice(0, 32);
    addTranscriptMessage(loadingMessageId, 'assistant', "I'm creating your image now... This might take a moment.", false);
    
    // Make API call to generate image
    fetch('/api/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })
    .then(response => {
      console.log('Image generation API response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Image generation successful, received URL:', data.image_url);
      
      // Add the image to the transcript
      addImageToTranscript(data.image_url, prompt);
      
      // Send tool call response back to the server
      if (callId) {
        console.log('Sending tool call response for call_id:', callId);
        sendClientEvent({
          type: "tool_call.response",
          call_id: callId,
          status: "success",
          output: {
            image_url: data.image_url,
            prompt: prompt
          }
        });
      }
    })
    .catch(error => {
      console.error('Error generating image:', error);
      setIsGeneratingImage(false);
      
      // Add error message to transcript
      addTranscriptMessage(uuidv4().slice(0, 32), 'assistant', "I'm sorry, I couldn't generate the image. Please try again.", false);
      
      // Send error response back to the server
      if (callId) {
        sendClientEvent({
          type: "tool_call.response",
          call_id: callId,
          status: "error",
          error: { message: "Failed to generate image" }
        });
      }
    });
  }, [sendClientEvent, addTranscriptMessage, addImageToTranscript]);

  useEffect(() => {
    // Use the image generation agent
    const agents = allAgentSets["imageGenerationAgent"];
    const agentKeyToUse = "imageGenerationAgent";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, []);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Agent: ${selectedAgentName}`,
        currentAgent
      );
      updateSession(true);
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      console.log(
        `updatingSession, isPTTACtive=${isPTTActive} sessionStatus=${sessionStatus}`
      );
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef
      );
      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        try {
          const parsedEvent = JSON.parse(e.data);
          console.log('Received event:', parsedEvent.type);
          
          // Process the event with the server event handler
          handleServerEventRef.current(parsedEvent);
          
          // Also process with our tool call handler
          handleToolCall(parsedEvent);
        } catch (error) {
          console.error('Error processing message event:', error);
        }
      });

      setDataChannel(dc);
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);

    logClientEvent({}, "disconnected");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    const turnDetection = isPTTActive
      ? null
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "coral",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  const cancelAssistantSpeech = async () => {
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can't cancel, no recent assistant message found");
      return;
    }
    if (mostRecentAssistantMessage.status === "DONE") {
      console.log("No truncation needed, message is DONE");
      return;
    }

    sendClientEvent({
      type: "conversation.item.truncate",
      item_id: mostRecentAssistantMessage?.itemId,
      content_index: 0,
      audio_end_ms: Date.now() - mostRecentAssistantMessage.createdAtMs,
    });
    sendClientEvent(
      { type: "response.cancel" },
      "(cancel due to user interruption)"
    );
  };

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    cancelAssistantSpeech();

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: userText.trim() }],
        },
      },
      "(send user text message)"
    );
    setUserText("");

    sendClientEvent({ type: "response.create" }, "trigger response");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    cancelAssistantSpeech();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
  };

  const handleTalkButtonUp = () => {
    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    sendClientEvent({ type: "response.create" }, "trigger response PTT");
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  // Agent selection logic removed - using image generation agent

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="text-base flex flex-col h-screen bg-gradient-to-br from-blue-50 to-purple-50 text-gray-800 relative">
      <div className="p-5 bg-white shadow-sm rounded-b-lg mb-4 text-lg font-semibold flex justify-between items-center">
        <div className="flex items-center">
          <div onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
            AI Image Generation <span className="font-normal text-gray-500">Assistant</span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="text-sm text-gray-500 mr-4">
            {sessionStatus === "CONNECTED" ? (
              <span className="flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </span>
            ) : sessionStatus === "CONNECTING" ? (
              <span className="flex items-center">
                <span className="h-2 w-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                Connecting...
              </span>
            ) : (
              <span className="flex items-center">
                <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 px-4 overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg shadow-lg">
          <div className="flex-1 overflow-hidden flex flex-col">
            <Transcript
              userText={userText}
              setUserText={setUserText}
              onSendMessage={handleSendTextMessage}
              canSend={
                sessionStatus === "CONNECTED" &&
                dcRef.current?.readyState === "open"
              }
              generatedImage={generatedImage}
              isGeneratingImage={isGeneratingImage}
            />
          </div>
          
          {/* Image display moved to Transcript component */}
        </div>

        {/* Keep Events component but hide it with CSS */}
        <div className="hidden">
          <Events isExpanded={isEventsPaneExpanded} />
        </div>
      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
      />
    </div>
  );
}

export default App;
