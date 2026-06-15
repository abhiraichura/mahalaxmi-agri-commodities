// src/pages/PartyMessageGenerator.tsx
import { useState, useEffect } from 'react';
import { Copy, Share2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../hooks/useAuthStore';

export default function PartyMessageGenerator() {
  const { parties } = useAppStore();
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const party = parties.find(p => p.id === selectedPartyId);
    if (party) {
      const contactName = party.contactPerson || party.name;
      setMessage(`Good morning ${contactName},\n\nPlease confirm if you have any specific requirements today for sesame, cumin, coriander, fenugreek, fennel, or moong.\nEarly confirmation helps us secure the best offers for you.\n\nRegards,\nMahalaxmi Agri Commodities\n90330 00032 | 98255 00032`);
    } else {
      setMessage('');
    }
  }, [selectedPartyId, parties]);

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
    
    const party = parties.find(p => p.id === selectedPartyId);
    let targetPhone = '';
    
    if (party && party.phone) {
      let cleanPhone = party.phone.replace(/[^\d+]/g, '');
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
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Party
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-100 focus:bg-white outline-none transition-all"
              >
                <option value="">-- Select a Party --</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name} {party.contactPerson ? `(${party.contactPerson})` : ''} {party.phone ? ` - ${party.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
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
