import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-full h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";

    if (isConnected) {
      // Connected -> label "Disconnect" -> red
      return `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`;
    }
    // Disconnected or connecting -> label is either "Connect" or "Connecting" -> black
    return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="p-4 bg-white border-t border-gray-200 shadow-sm flex flex-row items-center justify-center gap-x-6">
      <button
        onClick={onToggleConnection}
        className={getConnectionButtonClasses()}
        disabled={isConnecting}
      >
        {getConnectionButtonLabel()}
      </button>

      <div className="flex flex-row items-center gap-3">
        <div className="relative inline-flex items-center">
          <div className="relative">
            <input
              id="push-to-talk"
              type="checkbox"
              checked={isPTTActive}
              onChange={e => setIsPTTActive(e.target.checked)}
              disabled={!isConnected}
              className="sr-only"
            />
            <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${isPTTActive ? 'bg-purple-600' : 'bg-gray-300'} ${!isConnected ? 'opacity-50' : ''}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 transform ${isPTTActive ? 'translate-x-4' : ''}`}></div>
          </div>
          <label htmlFor="push-to-talk" className={`ml-3 text-sm font-medium ${!isConnected ? 'text-gray-400' : 'text-gray-700'} cursor-pointer`}>
            Push to talk
          </label>
        </div>
        <button
          onMouseDown={handleTalkButtonDown}
          onMouseUp={handleTalkButtonUp}
          onTouchStart={handleTalkButtonDown}
          onTouchEnd={handleTalkButtonUp}
          disabled={!isPTTActive}
          className={`
            flex items-center justify-center
            ${isPTTUserSpeaking ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}
            py-2 px-5 rounded-full font-medium transition-all duration-300
            ${!isPTTActive ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700 hover:text-white shadow-sm'}
          `}
        >
          {isPTTUserSpeaking ? (
            <>
              <span className="mr-2 h-2 w-2 bg-white rounded-full animate-pulse"></span>
              Speaking...
            </>
          ) : 'Talk'}
        </button>
      </div>

      <div className="flex flex-row items-center gap-3">
        <div className="relative inline-flex items-center">
          <div className="relative">
            <input
              id="audio-playback"
              type="checkbox"
              checked={isAudioPlaybackEnabled}
              onChange={e => setIsAudioPlaybackEnabled(e.target.checked)}
              disabled={!isConnected}
              className="sr-only"
            />
            <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${isAudioPlaybackEnabled ? 'bg-purple-600' : 'bg-gray-300'} ${!isConnected ? 'opacity-50' : ''}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 transform ${isAudioPlaybackEnabled ? 'translate-x-4' : ''}`}></div>
          </div>
          <label htmlFor="audio-playback" className={`ml-3 text-sm font-medium ${!isConnected ? 'text-gray-400' : 'text-gray-700'} cursor-pointer`}>
            Audio playback
          </label>
        </div>
      </div>

      {/* Logs toggle hidden but functionality preserved */}
      <div className="hidden">
        <input
          id="logs"
          type="checkbox"
          checked={isEventsPaneExpanded}
          onChange={e => setIsEventsPaneExpanded(e.target.checked)}
        />
      </div>
    </div>
  );
}

export default BottomToolbar;
