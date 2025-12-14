export enum AgentKey {
  MAIN = 'MAIN_ROUTER',
  SALES_AND_REVENUE = 'SALES_AND_REVENUE',
  PURCHASING_AND_INVENTORY = 'PURCHASING_AND_INVENTORY',
  FINANCIAL_REPORTING = 'FINANCIAL_REPORTING',
  MANUFACTURING_COST_ACCOUNTING = 'MANUFACTURING_COST_ACCOUNTING',
}

export interface AgentConfig {
  key: AgentKey;
  name: string;
  shortName: string;
  description: string;
  icon: string; // Lucide icon name mapping
  color: string;
  bgGradient: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  agent?: AgentKey; // The agent who sent this message
  timestamp: Date;
}

export interface RouterResponse {
  targetAgent: AgentKey;
  reason: string;
}
