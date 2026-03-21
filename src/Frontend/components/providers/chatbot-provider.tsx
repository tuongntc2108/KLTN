"use client"

import React, { createContext, useContext, ReactNode } from 'react';
import { RealChatbot } from '@/components/ai/chatbot';
import { useChatbot } from '@/hooks/use-chatbot';
import { useAuth } from '@/hooks/use-auth';

interface ChatbotContextType {
  isOpen: boolean;
  isConnected: boolean;
  hasNewMessages: boolean;
  openChatbot: () => void;
  closeChatbot: () => void;
  toggleChatbot: () => void;
  markMessagesAsRead: () => void;
  notifyNewMessage: () => void;
  setConnectionStatus: (connected: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function useChatbotContext() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbotContext must be used within a ChatbotProvider');
  }
  return context;
}

interface ChatbotProviderProps {
  children: ReactNode;
}

export function ChatbotProvider({ children }: ChatbotProviderProps) {
  const chatbotState = useChatbot();
  const { user } = useAuth();

  return (
    <ChatbotContext.Provider value={chatbotState}>
      {children}
      <RealChatbot
        isOpen={chatbotState.isOpen}
        onToggle={chatbotState.toggleChatbot}
        userEmail={user?.email}
        userRole={user?.role}
      />
    </ChatbotContext.Provider>
  );
}