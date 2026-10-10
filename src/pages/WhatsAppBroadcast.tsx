import React, { useState, useEffect } from 'react';
// import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
// import { db } from '../utils/firebase'; 

interface Party {
  id: string;
  name: string;
  phone: string;
  type: string;
  isSent: boolean;
}

export default function WhatsAppBroadcast() {
  const [parties, setParties] = useState<Party[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch parties from database
  useEffect(() => {
    const fetchParties = async () => {
      setLoading(true);
      try {
        // REPLACE THIS MOCK DATA WITH YOUR ACTUAL FIREBASE FETCH LOGIC
        // const querySnapshot = await getDocs(collection(db, 'parties'));
        // const fetchedParties = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isSent: false })) as Party[];
        
        const mockData: Party[] = [
          { id: '1', name: 'Ramesh Patel', phone: '919876543210', type: 'Buyer', isSent: false },
          { id: '2', name: 'Suresh Kumar', phone: '919876543211', type: 'Seller', isSent: false },
          { id: '3', name: 'Manoj Traders', phone: '919876543212', type: 'Buyer', isSent: true },
        ];
        setParties(mockData);
      } catch (error) {
        console.error('Error fetching parties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, []);

  const handleSend = async (party: Party) => {
    if (!message.trim()) {
      alert('Please enter a message first.');
      return;
    }

    // 1. Generate Link and Open WhatsApp
    const encodedMessage = encodeURIComponent(message);
    // Ensure phone number has country code but no spaces/plus signs
    const formattedPhone = party.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // 2. Update Status locally (and in Firebase)
    try {
      // FIREBASE UPDATE LOGIC:
      // const partyRef = doc(db, 'parties', party.id);
      // await updateDoc(partyRef, { lastBroadcastSent: new Date() });

      setParties(prev => 
        prev.map(p => p.id === party.id ? { ...p, isSent: true } : p)
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetAllStatuses = () => {
    if(window.confirm('Reset all sent statuses for a new broadcast?')) {
      setParties(prev => prev.map(p => ({ ...p, isSent: false })));
      // Note: You would also want to batch update this in Firebase if tracking persistently
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">WhatsApp Broadcast</h1>
        <button 
          onClick={resetAllStatuses}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          Reset All Statuses
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Message Input Section */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow border border-gray-200 h-fit">
          <h2 className="text-lg font-semibold mb-3">Broadcast Message</h2>
          <textarea
            className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">
            This message will be sent to the selected contacts.
          </p>
        </div>

        {/* Contacts List Section */}
        <div className="md:col-span-2 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                ) : (
                  parties.map((party) => (
                    <tr key={party.id} className={party.isSent ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{party.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${party.type === 'Buyer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {party.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{party.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {party.isSent ? (
                          <span className="flex items-center text-sm text-green-600 font-medium">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Sent
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleSend(party)}
                          disabled={party.isSent || !message.trim()}
                          className={`px-3 py-1.5 rounded-md text-white transition-colors ${
                            party.isSent || !message.trim() 
                              ? 'bg-gray-300 cursor-not-allowed' 
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {party.isSent ? 'Sent' : 'Send WhatsApp'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
