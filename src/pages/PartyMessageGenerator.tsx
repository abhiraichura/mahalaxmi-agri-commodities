// src/pages/PartyMessageGenerator.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Copy, Share2, MessageSquare, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';

export default function PartyMessageGenerator() {
  const { parties } = useAppStore();
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [message, setMessage] = useState('');
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedParties = useMemo(() => {
    return [...parties].sort((a, b) => a.name.localeCompare(b.name));
  }, [parties]);

  const filteredParties = useMemo(() => {
    return sortedParties.filter(p => {
      const searchLower = dropdownSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(searchLower) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(searchLower)) ||
        (p.phone && p.phone.includes(dropdownSearch))
      );
    });
  }, [sortedParties, dropdownSearch]);

  const selectedParty = useMemo(() => {
    return parties.find(p => p.id === selectedPartyId);
  }, [selectedPartyId, parties]);

  useEffect(() => {
    if (selectedParty) {
      const contactName = selectedParty.contactPerson || selectedParty.name;
      setMessage(`Good morning ${contactName},\n\nPlease confirm if you have any specific requirements today for sesame, cumin, coriander, fenugreek, fennel, or moong.\nEarly confirmation helps us secure the best offers for you.\n\nRegards,\nMahalaxmi Agri Commodities\n90330 00032 | 98255 00032`);
    } else {
      setMessage('');
    }
  }, [selectedPartyId, selectedParty]);

  const handleCopy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleWhatsAppShare = () => {
    if (!message) return;
    
    let targetPhone = '';
    
    if (selectedParty && selectedParty.phone) {
      let cleanPhone = selectedParty.phone.replace(/[^\d+]/g, '');
      if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
        cleanPhone = '91' + cleanPhone;
      }
      cleanPhone = cleanPhone.replace('+', '');
      targetPhone = cleanPhone;
    }

    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
      
    window.open(url, '_blank');
  };

  return (
    <div className="h-[calc(100vh-64px)] p-4 md:p-6 bg-gray-50 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Party Message Generator</h1>
            </div>
          </div>
          <div className="space-y-4">
            
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Party <span className="text-rose-500">*</span>
              </label>
              
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-all select-none"
              >
                <span className={selectedParty ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {selectedParty 
                    ? `${selectedParty.name} ${selectedParty.contactPerson ? `(${selectedParty.contactPerson})` : ''}`
                    : '-- Select or search a party --'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                  <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                    <Search className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                    <input
                      type="text"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder="Search by name, contact person, or phone..."
                      className="w-full bg-transparent py-1.5 px-1 text-sm outline-none border-none text-gray-700"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                    {filteredParties.length > 0 ? (
                      filteredParties.map((party) => (
                        <div
                          key={party.id}
                          onClick={() => {
                            setSelectedPartyId(party.id);
                            setIsDropdownOpen(false);
                            setDropdownSearch('');
                          }}
                          className={`px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
                            selectedPartyId === party.id 
                              ? 'bg-rose-50 text-rose-700 font-semibold' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{party.name}</div>
                          {(party.contactPerson || party.phone) && (
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                              {party.contactPerson && <span>{party.contactPerson}</span>}
                              {party.contactPerson && party.phone && <span>•</span>}
                              {party.phone && <span>{party.phone}</span>}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-400 italic">
                        No parties found matching "{dropdownSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
                Message Preview
              </label>
              <textarea
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-100 focus:bg-white outline-none transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!message}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 disabled:pointer-events-none rounded-xl text-sm font-semibold transition-all border border-stone-700"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                disabled={!message}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white disabled:pointer-events-none rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                <Share2 size={16} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
