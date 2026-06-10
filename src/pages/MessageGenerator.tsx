// src/pages/MessageGenerator.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Share2, MessageSquare, Calendar, History, Trash2, ChevronDown, Search, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SavedMessage {
  id: string;
  timestamp: string;
  commodity: string;
  rateType: 'mandi' | 'export';
  rawText: string;
}

// Predefined commodity array options
const COMMODITIES = [
  'Black Tal',
  'Jeera',
  'Dhana',
  'Kalonji',
  'Mung',
  'White Tal'
];

export default function MessageGenerator() {
  // Input fields state hooks
  const [commodity, setCommodity] = useState('');
  const [rateType, setRateType] = useState<'mandi' | 'export'>('mandi');
  const [mandiRate, setMandiRate] = useState('');
  const [exportRate, setExportRate] = useState('');
  const [arrival, setArrival] = useState('');
  const [priceMovement, setPriceMovement] = useState('');

  // Dropdown UI states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside the element area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter commodity choices based on active dropdown search query
  const filteredCommodities = useMemo(() => {
    return COMMODITIES.filter(c => 
      c.toLowerCase().includes(dropdownSearch.toLowerCase())
    );
  }, [dropdownSearch]);

  // Persistent historical memory state logs saved locally
  const [history, setHistory] = useState<SavedMessage[]>(() => {
    const cached = localStorage.getItem('mahalaxmi_message_history');
    return cached ? JSON.parse(cached) : [];
  });

  // Derived computed property: real-time live formatted messaging copy assembly
  const generatedMessage = useMemo(() => {
    if (!commodity.trim()) return '';

    const lines: string[] = [];
    // Add commodity first
    lines.push(commodity.trim());

    if (rateType === 'mandi') {
      // Mandi layout logic: optional parameters checked sequentially
      if (arrival.trim()) {
        const cleanArrival = arrival.toLowerCase().includes('bag') 
          ? arrival.trim() 
          : `${arrival.trim()} Bags`;
        lines.push(cleanArrival);
      }
      if (mandiRate.trim()) {
        lines.push(mandiRate.trim());
      }
      if (priceMovement.trim()) {
        lines.push(priceMovement.trim());
      }
    } else {
      // Export layout logic: just shows commodity and the export rate
      if (exportRate.trim()) {
        lines.push(exportRate.trim());
      }
    }

    return lines.join('\n');
  }, [commodity, rateType, mandiRate, exportRate, arrival, priceMovement]);

  // Helper method to completely flush the active form fields state values
  const handleResetFormFields = () => {
    setCommodity('');
    setRateType('mandi');
    setMandiRate('');
    setExportRate('');
    setArrival('');
    setPriceMovement('');
    setDropdownSearch('');
    setIsDropdownOpen(false);
    toast.success('Form cleared completely');
  };

  // Handle local storage updates safely
  const saveToApplicationState = (finalText: string) => {
    const newRecord: SavedMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      commodity: commodity.trim(),
      rateType,
      rawText: finalText
    };

    const updatedHistory = [newRecord, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('mahalaxmi_message_history', JSON.stringify(updatedHistory));
  };

  const handleCopyToClipboard = async () => {
    if (!commodity.trim()) {
      toast.error('Please select or type a commodity name.');
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedMessage);
      saveToApplicationState(generatedMessage);
      toast.success('Copied directly to clipboard!');
    } catch {
      toast.error('Failed to copy text contents.');
    }
  };

  const handleShareToWhatsApp = () => {
    if (!commodity.trim()) {
      toast.error('Please select or type a commodity name.');
      return;
    }
    
    saveToApplicationState(generatedMessage);

    const encodedMessage = encodeURIComponent(generatedMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const clearHistoryLog = () => {
    if (!confirm('Are you sure you want to clear your message history logs?')) return;
    setHistory([]);
    localStorage.removeItem('mahalaxmi_message_history');
    toast.success('History log removed');
  };

  // Check if there is anything written inside the inputs to show the reset action helper button dynamically
  const isFormDirty = useMemo(() => {
    return !!(commodity || mandiRate || exportRate || arrival || priceMovement);
  }, [commodity, mandiRate, exportRate, arrival, priceMovement]);

  return (
    <div className="h-[calc(100vh-64px)] p-4 md:p-6 bg-gray-50 overflow-y-auto font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Settings Input Form Panel */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Message Generator</h1>
                <p className="text-xs text-gray-400">Quickly draft and format messaging copy for WhatsApp streams</p>
              </div>
            </div>

            {/* Clear Fields Button Component Added in Header Toolbar Row */}
            {isFormDirty && (
              <button
                type="button"
                onClick={handleResetFormFields}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-100 transition-all shadow-sm"
                title="Reset all draft fields to empty values"
              >
                <RotateCcw size={14} />
                Clear Form
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Commodity selection modern custom search dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Commodity Name <span className="text-rose-500">*</span>
              </label>
              
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-all select-none"
              >
                <span className={commodity ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {commodity || 'Select or type a commodity...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
              </div>

              {/* Dropdown Floating Container View Card */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                  {/* Inline Search Bar inside Dropdown */}
                  <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                    <Search className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                    <input
                      type="text"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder="Filter list or type custom value..."
                      className="w-full bg-transparent py-1.5 px-1 text-sm outline-none border-none text-gray-700"
                    />
                  </div>
                  
                  {/* Option List Grid View */}
                  <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                    {filteredCommodities.length > 0 ? (
                      filteredCommodities.map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            setCommodity(item);
                            setIsDropdownOpen(false);
                            setDropdownSearch('');
                          }}
                          className={`px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
                            commodity === item 
                              ? 'bg-rose-50 text-rose-700 font-semibold' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      /* Custom Entry Fallback Callback Option if text input matches nothing on custom listing */
                      dropdownSearch.trim() && (
                        <div
                          onClick={() => {
                            setCommodity(dropdownSearch.trim());
                            setIsDropdownOpen(false);
                            setDropdownSearch('');
                          }}
                          className="px-3 py-2.5 rounded-xl text-sm text-rose-600 bg-rose-50/50 hover:bg-rose-50 cursor-pointer font-medium"
                        >
                          Use custom value: "{dropdownSearch.trim()}"
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rate categorization selector options toggle strip */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Rate Configuration Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRateType('mandi')}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-center ${
                    rateType === 'mandi'
                      ? 'bg-stone-800 border-stone-800 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Mandi Rate Info
                </button>
                <button
                  type="button"
                  onClick={() => setRateType('export')}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-center ${
                    rateType === 'export'
                      ? 'bg-stone-800 border-stone-800 text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Export Rate Only
                </button>
              </div>
            </div>

            {/* Condition Render blocks depending on dynamic selected variant structure types */}
            {rateType === 'mandi' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Mandi Rate (Optional)
                  </label>
                  <input
                    type="text"
                    value={mandiRate}
                    onChange={(e) => setMandiRate(e.target.value)}
                    placeholder="e.g. 3550-3600"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Arrivals (Optional)
                  </label>
                  <input
                    type="text"
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                    placeholder="e.g. 15,000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Price Movement (Optional)
                  </label>
                  <input
                    type="text"
                    value={priceMovement}
                    onChange={(e) => setPriceMovement(e.target.value)}
                    placeholder="e.g. 30 UP or 20 Down"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="pt-2 animate-fadeIn">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Export Rate Value
                </label>
                <input
                  type="text"
                  value={exportRate}
                  onChange={(e) => setExportRate(e.target.value)}
                  placeholder="e.g. 3925 - 30"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Real-Time Layout Screen Capture Previewer */}
        <div className="flex flex-col gap-6">
          <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between h-fit min-h-[280px]">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                <span className="text-xs font-medium uppercase tracking-widest text-stone-400">Live Preview</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              {generatedMessage ? (
                <pre className="whitespace-pre-wrap font-mono text-[15px] bg-stone-850 p-4 rounded-xl text-stone-100 leading-relaxed border border-stone-800">
                  {generatedMessage}
                </pre>
              ) : (
                <div className="text-center py-8 text-stone-500 text-sm italic">
                  Select a commodity above to instantly render string view blocks...
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-stone-800 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                disabled={!commodity.trim()}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 disabled:pointer-events-none rounded-xl text-sm font-semibold transition-all border border-stone-700"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                disabled={!commodity.trim()}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white disabled:pointer-events-none rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                <Share2 size={16} />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Persistent Active History Activity Log Frame */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex-1 flex flex-col max-h-[350px]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-gray-800 text-sm">
                <History className="w-4 h-4 text-gray-400" />
                <span>Today's Log Audit</span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearHistoryLog}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Clear history"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-xs">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">No messages logged yet.</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-medium text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {format(new Date(item.timestamp), 'hh:mm a • d LLL')}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold ${
                        item.rateType === 'export' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.rateType}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-700 truncate">{item.commodity}</p>
                    <pre className="text-[11px] text-gray-500 whitespace-pre-wrap font-sans bg-white p-1.5 border border-gray-100 rounded line-clamp-2">
                      {item.rawText}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
