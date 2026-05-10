import React, { createContext, useContext, useState } from "react";

interface ChatContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  return (
    <ChatContext.Provider value={{ activeConversationId, setActiveConversationId }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
