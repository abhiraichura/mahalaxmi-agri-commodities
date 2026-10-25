// src/pages/CustomMessageGenerator.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Copy, Share2, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';
import { Page, Button } from '../ui';

export default function CustomMessageGenerator() {
  const { parties } = useAppStore();
  const [template, setTemplate] = useState('Hi Mahalaxmi,\nBlack sesame seed at 215\nLet me know your requirement');
  const [replaceWord, setReplaceWord] = useState('Mahalaxmi');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [finalMessage, setFinalMessage] = useState('');
  
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
  return [...parties].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
      if (replaceWord && template) {
        const escapedWord = replaceWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedWord, 'gi');
        setFinalMessage(template.replace(regex, contactName));
      } else {
        setFinalMessage(template);
      }
    } else {
      setFinalMessage(template);
    }
  }, [selectedPartyId, selectedParty, template, replaceWord]);

  const handleCopy = async () => {
    if (!finalMessage) return;
    try {
      await navigator.clipboard.writeText(finalMessage);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleWhatsAppShare = () => {
    if (!finalMessage) return;
    
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
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(finalMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
      
    window.open(url, '_blank');
  };

  return (
    <Page title="Custom message" subtitle="Write one message, swap a word for each party, send it on WhatsApp" width="narrow">
      <div>
        <div className="card p-4 lg:p-6 space-y-6">
          <div className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Original Message Template
                </label>
                <textarea
                  rows={4}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Paste your message here..."
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Word to Replace
                </label>
                <input
                  type="text"
                  value={replaceWord}
                  onChange={(e) => setReplaceWord(e.target.value)}
                  placeholder="e.g. Mahalaxmi"
                  className="input-field"
                />
              </div>
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Party <span className="text-rose-600">*</span>
              </label>
              
              <div 
                role="button"
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsDropdownOpen(!isDropdownOpen); } }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="input-field flex items-center justify-between cursor-pointer select-none min-h-[48px]"
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
                      className="w-full bg-transparent py-2 px-1 text-sm outline-none border-none text-gray-700"
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
                          className={`px-3 py-3 rounded-xl text-sm cursor-pointer transition-colors ${
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

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-2">
                Final Output Message
              </label>
              <textarea
                rows={6}
                value={finalMessage}
                onChange={(e) => setFinalMessage(e.target.value)}
                className="input-field resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-2 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:static bg-white py-3 -mx-4 px-4 lg:mx-0 lg:px-0 lg:py-0 border-t border-gray-100 lg:border-0">
              <Button variant="secondary" icon={<Copy size={16} />} onClick={handleCopy} disabled={!finalMessage}>Copy</Button>
              <Button variant="success" icon={<Share2 size={16} />} onClick={handleWhatsAppShare} disabled={!finalMessage}>WhatsApp</Button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
