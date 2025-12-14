import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AgentKey, RouterResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the Main Router Agent
const ROUTER_SYSTEM_INSTRUCTION = `
Sebagai Agen Utama dalam Sistem Informasi Akuntansi (SIA) Manufaktur Garmen, peran Anda adalah menjadi router cerdas (Manage Accounting Operations). Anda harus secara konsisten dan akurat mengarahkan permintaan pengguna ke salah satu dari empat Sub-Agen spesialis di bawah.

DEFINISI SUB-AGEN SPESIALIS:

1.  SALES_AND_REVENUE: Memproses pesanan penjualan, menghasilkan faktur, dan melacak pendapatan real-time.
2.  PURCHASING_AND_INVENTORY: Mengelola pengadaan bahan baku, memantau tingkat persediaan, dan menyediakan informasi pemasok.
3.  FINANCIAL_REPORTING: Menghasilkan laporan keuangan formal (Laba Rugi, Neraca, Arus Kas) dan laporan analitis.
4.  MANUFACTURING_COST_ACCOUNTING: Menghitung Harga Pokok Produksi (HPP) garmen per job order, melacak biaya (bahan baku, tenaga kerja, overhead), dan menilai persediaan WIP/Barang Jadi.

LOGIKA PERUTEAN (Wajib Dipatuhi):

*   Jika permintaan terkait FAKTUR, PESANAN PENJUALAN, atau PELACAKAN PENDAPATAN, teruskan ke: SALES_AND_REVENUE.
*   Jika permintaan terkait PEMBELIAN BAHAN BAKU, TINGKAT STOK/INVENTARIS, atau INFORMASI PEMASOK, teruskan ke: PURCHASING_AND_INVENTORY.
*   Jika permintaan terkait LAPORAN LABA RUGI, NERACA, ARUS KAS, atau KEPATUHAN AKUNTANSI, teruskan ke: FINANCIAL_REPORTING.
*   Jika permintaan terkait PERHITUNGAN HPP, BIAYA PRODUKSI, PENGGUNAAN BAHAN BAKU, atau PENILAIAN WIP, teruskan ke: MANUFACTURING_COST_ACCOUNTING.
*   JANGAN pernah meneruskan permintaan ke lebih dari satu Sub-Agen.

Hasilkan output JSON yang berisi kunci agen target dan alasan singkat.
`;

// Schemas for structured output
const routerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    targetAgent: {
      type: Type.STRING,
      enum: [
        AgentKey.SALES_AND_REVENUE,
        AgentKey.PURCHASING_AND_INVENTORY,
        AgentKey.FINANCIAL_REPORTING,
        AgentKey.MANUFACTURING_COST_ACCOUNTING
      ],
      description: "The enum key of the target sub-agent."
    },
    reason: {
      type: Type.STRING,
      description: "A brief explanation of why this agent was selected."
    }
  },
  required: ["targetAgent", "reason"]
};

/**
 * Routes the user message to the correct agent using Gemini.
 */
export const routeUserRequest = async (message: string): Promise<RouterResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: ROUTER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: routerSchema,
        temperature: 0.1, // Low temperature for consistent routing
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as RouterResponse;

  } catch (error) {
    console.error("Routing Error:", error);
    // Fallback to Main agent on error
    return { targetAgent: AgentKey.MAIN, reason: "Gagal melakukan routing otomatis." };
  }
};

/**
 * Generates a response from a specific sub-agent.
 */
export const generateAgentResponse = async (
  agentKey: AgentKey,
  userMessage: string,
  history: string[]
): Promise<string> => {
  let systemInstruction = "";

  switch (agentKey) {
    case AgentKey.SALES_AND_REVENUE:
      systemInstruction = "Anda adalah Agen Penjualan & Pendapatan. Tugas Anda: Membuat invoice, cek status pesanan, dan rekap pendapatan. Bersikaplah profesional dan ringkas. Gunakan format tabel jika menyajikan data angka.";
      break;
    case AgentKey.PURCHASING_AND_INVENTORY:
      systemInstruction = "Anda adalah Agen Pembelian & Persediaan. Tugas Anda: Cek stok kain/benang, buat PO (Purchase Order) ke supplier, dan manajemen gudang. Berikan estimasi level stok secara simulasi.";
      break;
    case AgentKey.FINANCIAL_REPORTING:
      systemInstruction = "Anda adalah Agen Pelaporan Keuangan. Tugas Anda: Menyajikan Laba Rugi, Neraca, dan Arus Kas. Gunakan bahasa akuntansi formal (PSAK).";
      break;
    case AgentKey.MANUFACTURING_COST_ACCOUNTING:
      systemInstruction = "Anda adalah Agen Akuntansi Biaya Manufaktur. Fokus: Job Order Costing, HPP, Overhead Pabrik, dan WIP. Jelaskan perhitungan biaya dengan detail.";
      break;
    default:
      systemInstruction = "Anda adalah asisten umum.";
  }

  try {
    // Add context to history
    const prompt = `Context History:\n${history.join('\n')}\n\nUser Request: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Maaf, saya tidak dapat menghasilkan respon saat ini.";

  } catch (error) {
    console.error("Generation Error:", error);
    return "Terjadi kesalahan saat memproses permintaan Anda.";
  }
};