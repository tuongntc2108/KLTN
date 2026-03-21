import { useState, useCallback } from 'react';

interface ChatbotState {
  isOpen: boolean;
  isConnected: boolean;
  hasNewMessages: boolean;
}

export function useChatbot() {
  const [chatbotState, setChatbotState] = useState<ChatbotState>({
    isOpen: false,
    isConnected: true, // Assume connected by default
    hasNewMessages: false
  });

  const openChatbot = useCallback(() => {
    setChatbotState(prev => ({
      ...prev,
      isOpen: true,
      hasNewMessages: false
    }));
  }, []);

  const closeChatbot = useCallback(() => {
    setChatbotState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const toggleChatbot = useCallback(() => {
    setChatbotState(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
      hasNewMessages: prev.isOpen ? false : prev.hasNewMessages
    }));
  }, []);

  const markMessagesAsRead = useCallback(() => {
    setChatbotState(prev => ({
      ...prev,
      hasNewMessages: false
    }));
  }, []);

  const notifyNewMessage = useCallback(() => {
    setChatbotState(prev => ({
      ...prev,
      hasNewMessages: !prev.isOpen // Only show notification if chatbot is closed
    }));
  }, []);

  const setConnectionStatus = useCallback((connected: boolean) => {
    setChatbotState(prev => ({
      ...prev,
      isConnected: connected
    }));
  }, []);

  return {
    ...chatbotState,
    openChatbot,
    closeChatbot,
    toggleChatbot,
    markMessagesAsRead,
    notifyNewMessage,
    setConnectionStatus
  };
}