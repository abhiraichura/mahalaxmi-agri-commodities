import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface Party {
  id: string;
  name: string;
  phone?: string;
  mobile?: string; 
  type?: string;
  partyType?: string;
  isSent?: boolean;
}

interface ContactList {
  id: string;
  name: string;
  memberIds: string[];
  sentStatuses: Record<string, boolean>; // Tracks if sent today: { partyId: true/false }
}

export default function WhatsAppBroadcast() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'manage'>('broadcast');
  
  // Data States
  const [directory, setDirectory] = useState<Party[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  
  // UI States
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [editingListId, setEditingListId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load: Fetch Firebase Directory & Load Lists from LocalStorage
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Fetch Parties from Firebase
        const querySnapshot = await getDocs(collection(db, 'parties'));
        const fetchedParties = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Party[];
        
        // Sort alphabetically
        fetchedParties.sort((a, b) => a.name.localeCompare(b.name));
        setDirectory(fetchedParties);

        // Load Lists from Local Storage
        const savedListsStr = localStorage.getItem('whatsappBroadcastLists');
        let savedLists: ContactList[] = savedListsStr ? JSON.parse(savedListsStr) : [];

        // Check Midnight Reset
        const lastResetDate = localStorage.getItem('whatsappLastResetDate');
        const currentDate = new Date().toDateString();

        if (lastResetDate !== currentDate) {
          // Reset all sent statuses for a new day
          savedLists = savedLists.map(list => ({
            ...list,
            sentStatuses: {}
          }));
          localStorage.setItem('whatsappLastResetDate', currentDate);
        }

        setLists(savedLists);
        if (savedLists.length > 0) {
          setSelectedListId(savedLists[0].id);
        }

      } catch (error) {
        console.error('Error fetching directory:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Save lists to local storage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('whatsappBroadcastLists', JSON.stringify(lists));
    }
  }, [lists, isLoading]);

  // --- LIST MANAGEMENT FUNCTIONS ---
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    const newList: ContactList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      memberIds: [],
      sentStatuses: {}
    };
    
    setLists([...lists, newList]);
    setEditingListId(newList.id);
    setNewListName('');
    
    if (!selectedListId) setSelectedListId(newList.id);
  };

  const handleDeleteList = (id: string) => {
    if (window.confirm('Delete this list completely?')) {
      const updated = lists.filter(l => l.id !== id);
      setLists(updated);
      if (selectedListId === id) setSelectedListId(updated[0]?.id || '');
      if (editingListId === id) setEditingListId('');
    }
  };

  const toggleMemberInList = (listId: string, partyId: string) => {
    setLists(lists.map(list => {
      if (list.id === listId) {
        const isMember = list.memberIds.includes(partyId);
        return {
          ...list,
          memberIds: isMember 
            ? list.memberIds.filter(id => id !== partyId) 
            : [...list.memberIds, partyId]
        };
      }
      return list;
    }));
  };

  // --- BROADCAST FUNCTIONS ---
  const handleSend = (partyId: string, phone: string | undefined) => {
    if (!message.trim()) {
      alert('Please enter a message first.');
      return;
    }
    if (!phone) {
      alert('This party does not have a valid phone number.');
      return;
    }

    // Generate link and open WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');

    // Mark as sent
    setLists(lists.map(list => {
      if (list.id === selectedListId) {
        return {
          ...list,
          sentStatuses: { ...list.sentStatuses, [partyId]: true }
        };
      }
      return list;
    }));
  };

  // Helper to get full party details for a list
  const getListMembers = (list: ContactList | undefined) => {
    if (!list) return [];
    return list.memberIds
      .map(id => directory.find(p => p.id === id))
      .filter((p): p is Party => p !== undefined);
  };

  const activeList = lists.find(l => l.id === selectedListId);
  const editingList = lists.find(l => l.id === editingListId);

  if (isLoading) {
    return <div className="p-6 flex justify-center text-gray-500">Loading Directory...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'broadcast' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          Broadcast Message
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'manage' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          Manage Lists
        </button>
      </div>

      {/* =========================================
          TAB 1: BROADCAST VIEW (MAIN FLOW)
          ========================================= */}
      {activeTab === 'broadcast' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: List Selection & Message */}
          <div className="w-full lg:w-1/3 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">Select List</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
              >
                <option value="" disabled>-- Choose a List --</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.memberIds.length} members)</option>
                ))}
              </select>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
              <textarea
                className="w-full h-48 p-3 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste or type your broadcast message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Party Members & Action */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">
                  {activeList ? `${activeList.name} Members` : 'No List Selected'}
                </h2>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto max-h-[700px] bg-gray-50/50">
                {!activeList ? (
                  <p className="text-center text-gray-500 mt-10">Please select a list from the dropdown.</p>
                ) : activeList.memberIds.length === 0 ? (
                  <p className="text-center text-gray-500 mt-10">This list is empty. Go to "Manage Lists" to add parties.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getListMembers(activeList).map(member => {
                      const isSent = !!activeList.sentStatuses[member.id];
                      const contactNumber = member.phone || member.mobile || '';

                      return (
                        <div key={member.id} className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between ${isSent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-gray-900">{member.name}</h3>
                              <p className="text-sm text-gray-600">{contactNumber || 'No number'}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-gray-100 rounded-full">
                                {member.type || member.partyType || 'Party'}
                              </span>
                            </div>
                            
                            {isSent && (
                              <span className="flex items-center text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Sent
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleSend(member.id, contactNumber)}
                            disabled={isSent || !message.trim() || !contactNumber}
                            className={`w-full py-2 rounded-md text-sm font-bold transition-colors ${
                              isSent || !message.trim() || !contactNumber
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-sm'
                            }`}
                          >
                            {isSent ? 'Sent Today' : 'Send WhatsApp'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* =========================================
          TAB 2: MANAGE LISTS (SUBMENU/DIRECTORY)
          ========================================= */}
      {activeTab === 'manage' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Create & Select List */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Your Lists</h2>
              
              <form onSubmit={handleCreateList} className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="New list name..."
                  className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                  Add
                </button>
              </form>

              {lists.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No lists created yet.</p>
              ) : (
                <div className="space-y-2">
                  {lists.map(list => (
                    <div 
                      key={list.id} 
                      className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors border ${editingListId === list.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => setEditingListId(list.id)}
                    >
                      <div>
                        <span className="font-semibold text-gray-700">{list.name}</span>
                        <div className="text-xs text-gray-500 mt-0.5">{list.memberIds.length} parties</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }} className="text-red-500 hover:text-red-700 p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Add/Remove from Directory */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">
                  {editingList ? `Add/Remove Parties: ${editingList.name}` : 'Select a list to edit'}
                </h2>
              </div>

              {editingList ? (
                <div className="p-4 max-h-[700px] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {directory.map(party => {
                      const isSelected = editingList.memberIds.includes(party.id);
                      const contactNumber = party.phone || party.mobile || 'No Number';

                      return (
                        <label key={party.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => toggleMemberInList(editingList.id, party.id)}
                          />
                          <div className="ml-3 flex flex-col">
                            <span className="text-sm font-semibold text-gray-800">{party.name}</span>
                            <span className="text-xs text-gray-500">{party.type || party.partyType} • {contactNumber}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  Select a list from the left panel to manage its members.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
