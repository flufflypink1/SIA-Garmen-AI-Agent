import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  LayoutDashboard, 
  ShoppingCart, 
  Factory, 
  FileText, 
  Activity,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { AgentKey, ChatMessage, AgentConfig } from './types';
import { routeUserRequest, generateAgentResponse } from './services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

// --- Constants & Data ---

const AGENTS: Record<AgentKey, AgentConfig> = {
  [AgentKey.MAIN]: {
    key: AgentKey.MAIN,
    name: "SIA Manager",
    shortName: "Manager",
    description: "Router Pusat & Operasional",
    icon: "Bot",
    color: "text-slate-600",
    bgGradient: "from-slate-500 to-slate-700"
  },
  [AgentKey.SALES_AND_REVENUE]: {
    key: AgentKey.SALES_AND_REVENUE,
    name: "Sales & Revenue",
    shortName: "Sales",
    description: "Faktur, Pendapatan & Pesanan",
    icon: "ShoppingCart",
    color: "text-blue-600",
    bgGradient: "from-blue-500 to-blue-700"
  },
  [AgentKey.PURCHASING_AND_INVENTORY]: {
    key: AgentKey.PURCHASING_AND_INVENTORY,
    name: "Purchasing & Inventory",
    shortName: "Inventory",
    description: "Stok Bahan Baku & Supplier",
    icon: "Activity",
    color: "text-emerald-600",
    bgGradient: "from-emerald-500 to-emerald-700"
  },
  [AgentKey.MANUFACTURING_COST_ACCOUNTING]: {
    key: AgentKey.MANUFACTURING_COST_ACCOUNTING,
    name: "Cost Accounting",
    shortName: "Costing",
    description: "HPP, WIP & Biaya Produksi",
    icon: "Factory",
    color: "text-orange-600",
    bgGradient: "from-orange-500 to-orange-700"
  },
  [AgentKey.FINANCIAL_REPORTING]: {
    key: AgentKey.FINANCIAL_REPORTING,
    name: "Financial Reporting",
    shortName: "Finance",
    description: "Laporan Keuangan Formal",
    icon: "FileText",
    color: "text-violet-600",
    bgGradient: "from-violet-500 to-violet-700"
  }
};

// Mock Data for Visualizations
const DATA_SALES = [
  { name: 'Sen', value: 4000 },
  { name: 'Sel', value: 3000 },
  { name: 'Rab', value: 5000 },
  { name: 'Kam', value: 2780 },
  { name: 'Jum', value: 6890 },
  { name: 'Sab', value: 2390 },
];

const DATA_COST = [
  { name: 'Bahan Baku', value: 45000000 },
  { name: 'Tenaga Kerja', value: 30000000 },
  { name: 'Overhead', value: 15000000 },
];
const COLORS_COST = ['#0088FE', '#00C49F', '#FFBB28'];

const DATA_INVENTORY = [
  { name: 'Kain Katun', stok: 1200 },
  { name: 'Benang Poliester', stok: 800 },
  { name: 'Kancing', stok: 5000 },
  { name: 'Resleting', stok: 2000 },
];

const DATA_FINANCE = [
  { name: 'Q1', revenue: 120, profit: 40 },
  { name: 'Q2', revenue: 150, profit: 55 },
  { name: 'Q3', revenue: 180, profit: 70 },
  { name: 'Q4', revenue: 200, profit: 90 },
];

// --- Components ---

const IconComponent = ({ name, className }: { name: string, className?: string }) => {
  const icons: any = { Bot, ShoppingCart, Factory, FileText, Activity, LayoutDashboard };
  const LucideIcon = icons[name] || Bot;
  return <LucideIcon className={className} />;
};

const DashboardCard = ({ title, children, className = "" }: { title: string, children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 ${className}`}>
    <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">{title}</h3>
    {children}
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Selamat datang di SIA Manufaktur Garmen. Saya Agen Utama. Apa yang bisa saya bantu? (Contoh: "Buatkan invoice penjualan", "Berapa HPP batch A?", "Cek stok kain")',
      agent: AgentKey.MAIN,
      timestamp: new Date()
    }
  ]);
  const [activeAgent, setActiveAgent] = useState<AgentKey>(AgentKey.MAIN);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. ROUTING PHASE
      let targetAgent = activeAgent;
      let routingReason = "";

      // Only route if we are currently at MAIN or the user asks to switch explicitly
      // However, per architecture, MAIN is the router. Let's assume every new topic goes through routing logic if active agent is MAIN, 
      // OR we can make the system auto-detect context switching.
      // For this demo: We check intent on every message to simulate the "Smart Router"
      
      const routeResult = await routeUserRequest(userMsg.content);
      targetAgent = routeResult.targetAgent;
      routingReason = routeResult.reason;

      // Update active agent visually
      setActiveAgent(targetAgent);

      // Add a system note about routing if it changed
      if (targetAgent !== AgentKey.MAIN && targetAgent !== activeAgent) {
        const routingMsg: ChatMessage = {
          id: Date.now().toString() + '_routing',
          role: 'system',
          content: `🔀 Mengalihkan ke **${AGENTS[targetAgent].name}**: ${routingReason}`,
          agent: AgentKey.MAIN,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, routingMsg]);
      }

      // 2. EXECUTION PHASE
      // Collect last few messages for context
      const history = messages.slice(-5).map(m => `${m.role}: ${m.content}`);
      
      const responseText = await generateAgentResponse(targetAgent, userMsg.content, history);

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        agent: targetAgent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: "Maaf, terjadi kesalahan pada sistem agen.",
        agent: AgentKey.MAIN,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Functions ---

  const renderDashboard = () => {
    switch (activeAgent) {
      case AgentKey.SALES_AND_REVENUE:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pb-4">
            <DashboardCard title="Tren Penjualan Mingguan" className="col-span-2 md:col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DATA_SALES}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <ReTooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} activeDot={{r:8}} />
                </LineChart>
              </ResponsiveContainer>
            </DashboardCard>
            <DashboardCard title="Order Terbaru">
              <div className="space-y-3">
                {[101, 102, 103].map(id => (
                  <div key={id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <div>
                      <div className="text-sm font-bold text-slate-700">INV-{id}</div>
                      <div className="text-xs text-slate-500">PT Maju Mundur</div>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">Lunas</span>
                  </div>
                ))}
              </div>
            </DashboardCard>
            <DashboardCard title="Target Pendapatan">
               <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-4xl font-bold text-blue-600">Rp 1.2M</div>
                  <div className="text-sm text-slate-500 mt-2">Pencapaian: 85%</div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '85%'}}></div>
                  </div>
               </div>
            </DashboardCard>
          </div>
        );
      case AgentKey.MANUFACTURING_COST_ACCOUNTING:
        return (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pb-4">
            <DashboardCard title="Komposisi Biaya Produksi (Batch A-001)" className="col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DATA_COST} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                    {DATA_COST.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_COST[index % COLORS_COST.length]} />
                    ))}
                  </Pie>
                  <ReTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </DashboardCard>
             <DashboardCard title="WIP Valuation">
               <div className="space-y-4">
                 <div className="flex justify-between border-b pb-2">
                   <span className="text-slate-600">Cutting Dept</span>
                   <span className="font-semibold">Rp 15.000.000</span>
                 </div>
                 <div className="flex justify-between border-b pb-2">
                   <span className="text-slate-600">Sewing Dept</span>
                   <span className="font-semibold">Rp 42.500.000</span>
                 </div>
                 <div className="flex justify-between border-b pb-2">
                   <span className="text-slate-600">Finishing Dept</span>
                   <span className="font-semibold">Rp 8.200.000</span>
                 </div>
               </div>
             </DashboardCard>
             <DashboardCard title="Job Order Status">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Job #2201 - On Track</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Job #2204 - Pending Material</span>
                </div>
             </DashboardCard>
          </div>
        );
      case AgentKey.PURCHASING_AND_INVENTORY:
         return (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pb-4">
            <DashboardCard title="Stok Bahan Baku Utama" className="col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DATA_INVENTORY} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                  <XAxis type="number" hide/>
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <ReTooltip />
                  <Bar dataKey="stok" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>
            <DashboardCard title="Peringatan Stok Rendah">
               <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                 <Activity className="w-5 h-5 text-red-500 mt-0.5" />
                 <div>
                   <h4 className="text-sm font-bold text-red-700">Benang Nylon Putih</h4>
                   <p className="text-xs text-red-600">Stok sisa 20 roll. Min: 50. Segera buat PO.</p>
                 </div>
               </div>
            </DashboardCard>
            <DashboardCard title="Supplier Aktif">
               <ul className="text-sm text-slate-600 space-y-2">
                 <li>• PT Tekstil Nusantara (A)</li>
                 <li>• CV Benang Jaya (B)</li>
                 <li>• Global Accessories Ltd (A)</li>
               </ul>
            </DashboardCard>
          </div>
         );
      case AgentKey.FINANCIAL_REPORTING:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pb-4">
             <DashboardCard title="Kinerja Keuangan (Miliar Rp)" className="col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DATA_FINANCE}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Pendapatan" />
                  <Bar dataKey="profit" fill="#c4b5fd" name="Laba Bersih" />
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>
            <DashboardCard title="Dokumen Tersedia">
              <div className="space-y-2">
                <button className="flex items-center gap-2 w-full p-2 hover:bg-violet-50 rounded text-left text-sm text-slate-700 transition">
                  <FileText size={16} className="text-violet-600"/> Laporan_Laba_Rugi_Q3.pdf
                </button>
                <button className="flex items-center gap-2 w-full p-2 hover:bg-violet-50 rounded text-left text-sm text-slate-700 transition">
                  <FileText size={16} className="text-violet-600"/> Neraca_Saldo_Nov2024.xlsx
                </button>
              </div>
            </DashboardCard>
          </div>
        );
      default: // MAIN
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
               <LayoutDashboard size={32} />
             </div>
             <h3 className="text-lg font-medium text-slate-600">Dashboard Utama</h3>
             <p className="max-w-xs mt-2 text-sm">Silakan mulai percakapan untuk mengaktifkan agen spesialis (Sales, Inventory, Costing, atau Finance).</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Agents List */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Bot className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-slate-800 tracking-tight">SIA Garmen AI</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 px-2 mb-2 uppercase tracking-wider">Agen Aktif</p>
          {Object.values(AGENTS).map((agent) => {
            const isActive = activeAgent === agent.key;
            return (
              <div 
                key={agent.key}
                onClick={() => {
                  setActiveAgent(agent.key);
                  setIsSidebarOpen(false);
                }}
                className={`
                  flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer
                  ${isActive ? 'bg-slate-900 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}
                `}
              >
                <div className={`
                  p-2 rounded-lg shrink-0
                  ${isActive ? 'bg-white/20 text-white' : `bg-slate-100 ${agent.color}`}
                `}>
                  <IconComponent name={agent.icon} className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{agent.name}</div>
                  <div className={`text-xs mt-0.5 leading-tight ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {agent.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Header (Mobile Only) */}
        <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-slate-700">{AGENTS[activeAgent].shortName} Agent</span>
          <div className="w-6"></div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          
          {/* Chat Area */}
          <div className="flex-1 flex flex-col max-w-3xl border-r border-slate-200 bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isSystem = msg.role === 'system';
                const agent = msg.agent ? AGENTS[msg.agent] : AGENTS[AgentKey.MAIN];

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full text-center max-w-[90%]">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center shrink-0
                      ${isUser ? 'bg-indigo-100 text-indigo-600' : `bg-gradient-to-br ${agent.bgGradient} text-white`}
                    `}>
                      {isUser ? <div className="text-xs font-bold">U</div> : <IconComponent name={agent.icon} className="w-4 h-4" />}
                    </div>
                    
                    <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-700">
                          {isUser ? 'Anda' : agent.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className={`
                        px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                        ${isUser 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none'}
                      `}>
                         {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                 <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 shrink-0`}>
                      <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-slate-400 italic">Sedang mengetik...</span>
                    </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Tanya ${AGENTS[activeAgent].shortName}...`}
                  disabled={isLoading}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-full pl-5 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="text-[10px] text-center text-slate-400 mt-2">
                SIA AI Garmen dapat membuat kesalahan. Periksa informasi penting.
              </div>
            </div>
          </div>

          {/* Right Panel: Contextual Dashboard */}
          <div className="hidden md:flex flex-col flex-1 bg-slate-50/50 p-6 h-full overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{AGENTS[activeAgent].name} Dashboard</h2>
                <p className="text-sm text-slate-500">Live data overview & document status</p>
              </div>
              <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-500">
                Live Preview
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              {renderDashboard()}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;