import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  sentStatuses: Record<string, boolean>;
  lastResetDate: string;
}

export default function WhatsAppBroadcast() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'manage'>('broadcast');
  
  const [directory, setDirectory] = useState<Party[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [editingListId, setEditingListId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [broadcastSearch, setBroadcastSearch] = useState('');
  const [manageSearch, setManageSearch] = useState('');

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'parties'));
        const fetchedParties = querySnapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data() 
        })) as Party[];
        
        fetchedParties.sort((a, b) => a.name.localeCompare(b.name));
        setDirectory(fetchedParties);

        const listsSnapshot = await getDocs(collection(db, 'whatsapp_lists'));
        const fetchedLists = listsSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as ContactList[];

        const currentDate = new Date().toDateString();

        const processedLists = await Promise.all(fetchedLists.map(async (list) => {
          if (list.lastResetDate !== currentDate) {
            const updatedList = { ...list, sentStatuses: {}, lastResetDate: currentDate };
            await updateDoc(doc(db, 'whatsapp_lists', list.id), {
              sentStatuses: {},
              lastResetDate: currentDate
            });
            return updatedList;
          }
          return list;
        }));

        setLists(processedLists);
        if (processedLists.length > 0) {
          setSelectedListId(processedLists[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    const newListId = Date.now().toString();
    const newList: ContactList = {
      id: newListId,
      name: newListName.trim(),
      memberIds: [],
      sentStatuses: {},
      lastResetDate: new Date().toDateString()
    };
    
    setLists([...lists, newList]);
    setEditingListId(newList.id);
    setNewListName('');
    if (!selectedListId) setSelectedListId(newList.id);

    try {
      await setDoc(doc(db, 'whatsapp_lists', newListId), newList);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (window.confirm('Delete this list completely? This cannot be undone.')) {
      const updated = lists.filter(l => l.id !== id);
      setLists(updated);
      if (selectedListId === id) setSelectedListId(updated[0]?.id || '');
      if (editingListId === id) setEditingListId('');

      try {
        await deleteDoc(doc(db, 'whatsapp_lists', id));
      } catch (error) {
        console.error('Error deleting list:', error);
      }
    }
  };

  const toggleMemberInList = async (listId: string, partyId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    const isMember = list.memberIds.includes(partyId);
    const newMemberIds = isMember 
      ? list.memberIds.filter(id => id !== partyId) 
      : [...list.memberIds, partyId];

    setLists(lists.map(l => l.id === listId ? { ...l, memberIds: newMemberIds } : l));

    try {
      await updateDoc(doc(db, 'whatsapp_lists', listId), { memberIds: newMemberIds });
    } catch (error) {
      console.error('Error updating members:', error);
    }
  };

  const handleSend = async (partyId: string, phone: string | undefined) => {
    if (!message.trim()) {
      alert('Please enter a message first.');
      return;
    }
    if (!phone) {
      alert('This party does not have a valid phone number.');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`;
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    
    if (isAndroid || isIOS) {
      window.location.href = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
    } else {
      window.open(`https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`, '_blank');
    }

    const activeList = lists.find(l => l.id === selectedListId);
    if (!activeList) return;

    const newStatuses = { ...activeList.sentStatuses, [partyId]: true };

    setLists(lists.map(list => {
      if (list.id === selectedListId) {
        return { ...list, sentStatuses: newStatuses };
      }
      return list;
    }));

    try {
      await updateDoc(doc(db, 'whatsapp_lists', selectedListId), { sentStatuses: newStatuses });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleManualReset = async () => {
    if (!activeList) return;
    if (window.confirm(`Reset all sent statuses for "${activeList.name}"?`)) {
      setLists(lists.map(list => {
        if (list.id === selectedListId) {
          return { ...list, sentStatuses: {} };
        }
        return list;
      }));

      try {
        await updateDoc(doc(db, 'whatsapp_lists', selectedListId), { sentStatuses: {} });
      } catch (error) {
        console.error('Error resetting statuses:', error);
      }
    }
  };

  const activeList = lists.find(l => l.id === selectedListId);
  const editingList = lists.find(l => l.id === editingListId);

  const getFilteredBroadcastMembers = () => {
    if (!activeList) return [];
    
    // First map and filter out undefined
    let members = activeList.memberIds
      .map(id => directory.find(p => p.id === id))
      .filter((p): p is Party => p !== undefined);
      
    // Then apply text search if it exists
    if (broadcastSearch.trim()) {
      const term = broadcastSearch.toLowerCase();
      members = members.filter(m => 
        m.name.toLowerCase().includes(term) || 
        (m.phone && m.phone.includes(term)) ||
        (m.mobile && m.mobile.includes(term))
      );
    }

    // Finally, sort so that SENT items drop to the bottom of the list
    return members.sort((a, b) => {
      const aSent = !!activeList.sentStatuses[a.id];
      const bSent = !!activeList.sentStatuses[b.id];
      
      if (aSent === bSent) return 0; // keep original alphabetical order if statuses are the same
      return aSent ? 1 : -1;         // if a is sent, push it down the list (1)
    });
  };

  const getFilteredDirectory = () => {
    if (!manageSearch.trim()) return directory;
    
    const term = manageSearch.toLowerCase();
    return directory.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.phone && p.phone.includes(term)) ||
      (p.mobile && p.mobile.includes(term))
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <svg className="animate-spin h-8 w-8 mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading Data from Firebase...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
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

      {activeTab === 'broadcast' && (
        <div className="flex flex-col lg:flex-row gap-6">
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

          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {activeList ? `${activeList.name} Members` : 'No List Selected'}
                  </h2>
                </div>
                
                {activeList && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search members..."
                      className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48"
                      value={broadcastSearch}
                      onChange={(e) => setBroadcastSearch(e.target.value)}
                    />
                    <button
                      onClick={handleManualReset}
                      className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition-colors whitespace-nowrap"
                    >
                      Reset Statuses
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto max-h-[700px] bg-gray-50/50">
                {!activeList ? (
                  <p className="text-center text-gray-500 mt-10">Please select a list from the dropdown.</p>
                ) : activeList.memberIds.length === 0 ? (
                  <p className="text-center text-gray-500 mt-10">This list is empty. Go to "Manage Lists" to add parties.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getFilteredBroadcastMembers().map(member => {
                      const isSent = !!activeList.sentStatuses[member.id];
                      const contactNumber = member.phone || member.mobile || '';

                      return (
                        <div key={member.id} className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-300 ease-in-out ${isSent ? 'bg-green-50 border-green-200 shadow-sm opacity-60' : 'bg-white border-gray-200 shadow-sm'}`}>
                          
                          <div className="flex flex-col overflow-hidden mr-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-sm truncate">{member.name}</h3>
                              {isSent && (
                                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-600">{contactNumber || 'No number'}</span>
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {member.type || member.partyType || 'Party'}
                              </span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleSend(member.id, contactNumber)}
                            disabled={isSent || !message.trim() || !contactNumber}
                            className={`flex-shrink-0 p-2.5 rounded-full flex items-center justify-center transition-colors ${
                              isSent || !message.trim() || !contactNumber
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-[#25D366] text-white hover:bg-[#128C7E] shadow-sm'
                            }`}
                            title={isSent ? 'Sent Today' : 'Send WhatsApp'}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                    {getFilteredBroadcastMembers().length === 0 && (
                       <p className="text-center text-gray-500 mt-10 col-span-full">No members match your search.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="flex flex-col lg:flex-row gap-6">
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

          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h2 className="text-lg font-bold text-gray-800">
                  {editingList ? `Add/Remove Parties: ${editingList.name}` : 'Select a list to edit'}
                </h2>
                
                {editingList && (
                  <input
                    type="text"
                    placeholder="Search directory..."
                    className="p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                  />
                )}
              </div>

              {editingList ? (
                <div className="p-3 flex-1 overflow-y-auto max-h-[700px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getFilteredDirectory().map(party => {
                      const isSelected = editingList.memberIds.includes(party.id);
                      const contactNumber = party.phone || party.mobile || 'No Number';

                      return (
                        <label key={party.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => toggleMemberInList(editingList.id, party.id)}
                          />
                          <div className="ml-3 flex flex-col">
                            <span className="text-sm font-semibold text-gray-800 truncate">{party.name}</span>
                            <span className="text-xs text-gray-500">{party.type || party.partyType} • {contactNumber}</span>
                          </div>
                        </label>
                      );
                    })}
                    {getFilteredDirectory().length === 0 && (
                      <p className="text-center text-gray-500 mt-10 col-span-full">No parties match your search.</p>
                    )}
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
