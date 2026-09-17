import React, { createContext, useContext, useState } from 'react';

interface HoverContextType {
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
}

const HoverContext = createContext<HoverContextType>({
  hoveredNodeId: null,
  setHoveredNodeId: () => {},
});

export const HoverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  return (
    <HoverContext.Provider value={{ hoveredNodeId, setHoveredNodeId }}>
      {children}
    </HoverContext.Provider>
  );
};

export const useHoveredNode = () => useContext(HoverContext);
