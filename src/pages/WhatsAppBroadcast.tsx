import React, { useState, useEffect } from 'react';

// If you are using Firebase, import your DB config here to fetch the real directory:
// import { collection, getDocs } from 'firebase/firestore';
// import { db } from '../utils/firebase'; 

interface Party {
  id: string;
  name: string;
  phone: string;
  type: string;
  isSent?: boolean;
}

interface ContactList {
  id: string;
  name: string;
  members: Party[];
}

export default function WhatsAppBroadcast() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [directory, setDirectory] = useState<Party[]>([]);

  // 1. Check for Midnight Reset and Load Lists
  useEffect(() => {
    const loadAndCheckReset = () => {
      const savedListsStr = localStorage.getItem('whatsappBroadcastLists');
      let savedLists: ContactList[] = savedListsStr ? JSON.parse(savedListsStr) : [];

      // Check current date against the last saved reset date
      const lastResetDate = localStorage.getItem('whatsappLastResetDate');
      const currentDate = new Date().toDateString(); // e.g. "Mon Oct 10 2026"

      if (lastResetDate !== currentDate) {
        // It's a new day! Reset all isSent statuses to false
        savedLists = savedLists.map(list => ({
          ...list,
          members: list.members.map(member => ({ ...member, isSent: false }))
        }));
        localStorage.setItem('whatsappLastResetDate', currentDate);
      }

      setLists(savedLists);
      if (savedLists.length > 0) {
        setSelectedListId(savedLists[0].id);
      }
    };

    loadAndCheckReset();
    fetchDirectory();
  }, []);

  // Save lists to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('whatsappBroadcastLists', JSON.stringify(lists));
  }, [lists]);

  // Fetch Directory (Replace mock data with your DB fetch)
  const fetchDirectory = async () => {
    // try {
    //   const querySnapshot = await getDocs(collection(db, 'parties'));
    //   const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Party[];
    //   setDirectory(fetched);
    // } catch(e) {}
    
    // Mock Directory Data
    setDirectory([
      { id: '1', name: 'Ramesh Patel', phone: '919876543210', type: 'Buyer' },
      { id: '2', name: 'Suresh Kumar', phone: '919876543211', type: 'Seller' },
      { id: '3', name: 'Manoj Traders', phone: '919876543212', type: 'Buyer' },
      { id: '4', name: 'Amit Singh', phone: '919876543213', type: 'Seller' },
      { id: '5', name: 'Gujarat Agri Hub', phone: '919876543214', type: 'Broker' },
    ]);
  };

  const createList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    const newList: ContactList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      members: []
    };
    
    setLists([...lists, newList]);
    setSelectedListId(newList.id);
    setNewListName('');
  };

  const deleteList = (id: string) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      const updated = lists.filter(l => l.id !== id);
      setLists(updated);
      if (selectedListId === id) setSelectedListId(updated[0]?.id || '');
    }
  };

  const toggleDirectoryMember = (party: Party) => {
    setLists(lists.map(list => {
      if (list.id === selectedListId) {
        const isMember = list.members.some(m => m.id === party.id);
        if (isMember) {
          return { ...list, members: list.members.filter(m => m.id !== party.id) };
        } else {
          return { ...list, members: [...list.members, { ...party, isSent: false }] };
        }
      }
      return list;
    }));
  };

  const handleSend = (partyId: string, phone: string) => {
    if (!message.trim()) {
      alert('Please enter a message first.');
      return;
    }

    // 1. Open WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');

    // 2. Mark as sent in the current list
    setLists(lists.map(list => {
      if (list.id === selectedListId) {
        return {
          ...list,
          members: list.members.map(m => m.id === partyId ? { ...m, isSent: true } : m)
        };
      }
      return list;
    }));
  };

  const selectedList = lists.find(l => l.id === selectedListId);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      
      {/* LEFT PANEL: Lists & Message */}
      <div className="w-full lg:w-1/3 space-y-6">
        
        {/* List Management */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Your Lists</h2>
          
          <form onSubmit={createList} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="New list name (e.g., Buyers)"
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
                  className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors border ${selectedListId === list.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setSelectedListId(list.id)}
                >
                  <div>
                    <span className="font-semibold text-gray-700">{list.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({list.members.length} members)</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="text-red-500 hover:text-red-700 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold mb-3 text-gray-800">Message Content</h2>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type or paste the message you want to broadcast..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

      </div>

      {/* RIGHT PANEL: List Members & Action */}
      <div className="w-full lg:w-2/3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
          
          {selectedList ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">{selectedList.name}</h2>
                <button 
                  onClick={() => setIsAddingContacts(!isAddingContacts)}
                  className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900 transition-colors"
                >
                  {isAddingContacts ? 'Done Adding' : '+ Add/Remove Parties'}
                </button>
              </div>

              {/* Add Contacts Directory View */}
              {isAddingContacts && (
                <div className="p-4 bg-gray-50 border-b border-gray-200 max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-600 mb-3 font-medium">Select parties to include in "{selectedList.name}"</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {directory.map(party => {
                      const isSelected = selectedList.members.some(m => m.id === party.id);
                      return (
                        <label key={party.id} className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => toggleDirectoryMember(party)}
                          />
                          <div className="ml-3 flex flex-col">
                            <span className="text-sm font-semibold text-gray-800">{party.name}</span>
                            <span className="text-xs text-gray-500">{party.type} • {party.phone}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Members List (Mobile Friendly Cards) */}
              <div className="p-4 flex-1 overflow-y-auto bg-gray-50">
                {selectedList.members.length === 0 ? (
                  <div className="text-center mt-10 text-gray-500">
                    <p>No parties in this list yet.</p>
                    <p className="text-sm mt-1">Click "+ Add/Remove Parties" to build your list.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedList.members.map(member => (
                      <div key={member.id} className={`p-4 rounded-lg border shadow-sm flex flex-col justify-between ${member.isSent ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-gray-900">{member.name}</h3>
                            <p className="text-sm text-gray-500">{member.phone}</p>
                            <span className="inline-block mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600 bg-gray-200 rounded-full">
                              {member.type}
                            </span>
                          </div>
                          
                          {member.isSent && (
                            <span className="flex items-center text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              Sent
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleSend(member.id, member.phone)}
                          disabled={member.isSent || !message.trim()}
                          className={`w-full py-2 rounded-md text-sm font-bold transition-colors ${
                            member.isSent || !message.trim() 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-sm'
                          }`}
                        >
                          {member.isSent ? 'Sent' : 'Send WhatsApp'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 p-10">
              Select or create a list to start broadcasting.
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
