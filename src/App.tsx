/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Download, 
  Image as ImageIcon, 
  User, 
  Palette, 
  Loader2, 
  ChevronRight, 
  MessageSquare, 
  X, 
  Send,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { generatePrompts, generateColoringImage, chatWithGemini } from './services/geminiService';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type ImageSize = '1K' | '2K' | '4K';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [theme, setTheme] = useState('');
  const [childName, setChildName] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [images, setImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your creative assistant. Need some theme ideas for your coloring book?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkKey();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const checkKey = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (e) {
      console.error("Key check failed", e);
    }
  };

  const handleOpenKeyDialog = async () => {
    try {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleGenerate = async () => {
    if (!theme || !childName) {
      setError("Please provide both a theme and a child's name.");
      return;
    }
    if (!hasKey) {
      setError("Please select an API key first.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setImages([]);

    try {
      const prompts = await generatePrompts(theme);
      const generatedImages: string[] = [];

      for (let i = 0; i < 5; i++) {
        setProgress((i / 5) * 100);
        const img = await generateColoringImage(prompts[i] || theme, imageSize);
        generatedImages.push(img);
        setImages([...generatedImages]);
      }

      setProgress(100);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API key error. Please re-select your API key.");
      } else {
        setError("Something went wrong during generation. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPdf = async () => {
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Cover Page
    doc.setFillColor(245, 245, 240);
    doc.rect(0, 0, width, height, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(40, 40, 40);
    doc.text("Magic Coloring Book", width / 2, height / 3, { align: 'center' });
    
    doc.setFontSize(24);
    doc.text(`For ${childName}`, width / 2, height / 2, { align: 'center' });
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(16);
    doc.text(`Theme: ${theme}`, width / 2, height / 2 + 20, { align: 'center' });

    // Add images
    for (let i = 0; i < images.length; i++) {
      doc.addPage();
      doc.addImage(images[i], 'PNG', 10, 10, width - 20, width - 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Page ${i + 1}`, width / 2, height - 10, { align: 'center' });
    }

    doc.save(`${childName}_coloring_book.pdf`);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: inputMessage }];
    setMessages(newMessages);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const response = await chatWithGemini(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response || "I'm not sure how to respond to that." }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-200">
      {/* Header */}
      <header className="border-b border-black/5 px-6 py-8 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Palette size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MagicColor</h1>
        </div>
        
        {!hasKey && (
          <button 
            onClick={handleOpenKeyDialog}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
          >
            <AlertCircle size={16} />
            Connect API Key
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-16">
        {/* Left Column: Form */}
        <section className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-light leading-tight tracking-tight">
              Create a <span className="italic font-serif">personalized</span> coloring book.
            </h2>
            <p className="text-black/60 text-lg max-w-md">
              Enter a theme and your child's name to generate a unique 5-page coloring book in seconds.
            </p>
          </div>

          <div className="space-y-6 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-black/40 flex items-center gap-2">
                <User size={14} /> Child's Name
              </label>
              <input 
                type="text" 
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Leo"
                className="w-full px-0 py-2 border-b-2 border-black/10 focus:border-orange-500 outline-none text-xl transition-colors bg-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-black/40 flex items-center gap-2">
                <Sparkles size={14} /> Book Theme
              </label>
              <input 
                type="text" 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Space Dinosaurs"
                className="w-full px-0 py-2 border-b-2 border-black/10 focus:border-orange-500 outline-none text-xl transition-colors bg-transparent"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-black/40 flex items-center gap-2">
                <ImageIcon size={14} /> Image Quality
              </label>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setImageSize(size)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                      imageSize === size 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-black/60 border-black/10 hover:border-black/30'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-5 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Book
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Column: Preview */}
        <section className="relative">
          <div className="sticky top-12 space-y-8">
            <div className="aspect-[3/4] bg-white rounded-[2rem] border border-black/5 shadow-2xl overflow-hidden flex flex-col">
              {images.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  <div className="aspect-square bg-[#F5F5F0] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-black/10 p-8 text-center">
                    <BookOpen size={48} className="text-black/20 mb-4" />
                    <h3 className="text-2xl font-serif italic">Magic Coloring Book</h3>
                    <p className="text-black/40">For {childName}</p>
                  </div>
                  {images.map((img, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="aspect-square bg-white rounded-2xl border border-black/10 overflow-hidden group relative"
                    >
                      <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-black/5 shadow-sm">
                        Page {idx + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-200">
                    <ImageIcon size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-medium">Your book will appear here</h3>
                    <p className="text-black/40 text-sm max-w-[240px]">
                      Fill in the details on the left to start generating your custom coloring book.
                    </p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="p-8 bg-white border-t border-black/5">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-black/40 mb-2">
                    <span>Generating Pages</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {images.length === 5 && !isGenerating && (
                <div className="p-8 bg-white border-t border-black/5">
                  <button 
                    onClick={downloadPdf}
                    className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-black/80 transition-all"
                  >
                    <Download size={20} />
                    Download PDF Book
                  </button>
                </div>
              )}
            </div>

            {/* Features list */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-black/5 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-xs font-medium">5 Unique Pages</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-black/5 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-xs font-medium">High Quality PDF</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Chatbot */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-black/5 flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-black text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <span className="font-bold text-sm">Creative Assistant</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-orange-500 text-white rounded-tr-none' 
                        : 'bg-black/5 text-black rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-black/5 p-3 rounded-2xl rounded-tl-none">
                      <Loader2 size={16} className="animate-spin text-black/40" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-black/5 flex gap-2">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask for theme ideas..."
                  className="flex-1 bg-black/5 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-orange-500/20"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading}
                  className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />}
        </button>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-6 text-black/40 text-sm">
        <p>© 2026 MagicColor Generator. All rights reserved.</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-black transition-colors">Privacy</a>
          <a href="#" className="hover:text-black transition-colors">Terms</a>
          <a href="#" className="hover:text-black transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
