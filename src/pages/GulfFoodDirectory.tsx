import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, Mail, MapPin, Globe, User, X, Download, Upload, FileText, Trash2, Edit2, ExternalLink, AlertTriangle, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getColData, addDoc, updateDocData, deleteDocData } from '../utils/firebase';

interface GulfFoodMember {
  id: string;
  companyName: string;
  cityState: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  website: string;
  profile: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'gulfood_directory_members';
const COLLECTION_NAME = 'gulfood_members';

function getStoredMembers(): GulfFoodMember[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export default function GulfFoodDirectory() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<GulfFoodMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingMember, setViewingMember] = useState<GulfFoodMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<GulfFoodMember | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  // Duplicate Check State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    matchedName: string;
  } | null>(null);

  const [form, setForm] = useState({
    companyName: '',
    cityState: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    website: '',
    profile: ''
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const fbData = await getColData(COLLECTION_NAME);
        
        if (fbData.length === 0) {
          const localData = getStoredMembers();
          if (localData.length > 0) {
            toast.loading('Migrating data to cloud...');
            for (const member of localData) {
              await addDoc(COLLECTION_NAME, member.id, member);
            }
            setMembers(localData);
            toast.dismiss();
            toast.success('Data successfully migrated to cloud!');
          } else {
            setMembers([]);
          }
        } else {
          setMembers(fbData as GulfFoodMember[]);
        }
      } catch (error) {
        console.error('Error fetching Gulfood members:', error);
        toast.error('Failed to load directory');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMembers();
  }, []);

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
    setDeleteStep(0);
  };

  const filtered = useMemo(() => {
    let result = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = members.filter(m =>
        m.companyName.toLowerCase().includes(q) ||
        m.cityState.toLowerCase().includes(q) ||
        m.contactPerson.toLowerCase().includes(q) ||
        m.contactNumber.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.profile.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => a.companyName.localeCompare(b.companyName));
    return result;
  }, [members, search]);

  // Bulk Selection Logic
  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(m => m.id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleCardClick = (member: GulfFoodMember) => {
    if (isSelectionMode) {
      toggleSelection(member.id);
    } else {
      setViewingMember(member);
    }
  };

  const executeBulkDelete = async () => {
    toast.loading('Deleting members...');
    try {
      for (const id of selectedIds) {
        await deleteDocData(COLLECTION_NAME, id);
      }
      setMembers(members.filter(m => !selectedIds.includes(m.id)));
      toast.dismiss();
      toast.success(`Successfully deleted ${selectedIds.length} members`);
      cancelSelectionMode();
    } catch (error) {
      toast.dismiss();
      toast.error('Error deleting members');
      setDeleteStep(0);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    const cleanContact = form.contactNumber.replace(/\s/g, '');
    if (cleanContact) {
      const isDuplicate = members.find(m => 
        m.id !== editingMember?.id && 
        m.contactNumber.replace(/\s/g, '') === cleanContact
      );

      if (isDuplicate) {
        setDuplicateWarning({ show: true, matchedName: isDuplicate.companyName });
        return;
      }
    }

    executeSave();
  };

  const executeSave = async () => {
    const now = new Date().toISOString();
    
    try {
      if (editingMember) {
        const updatedMember = { ...editingMember, ...form, updatedAt: now };
        await updateDocData(COLLECTION_NAME, editingMember.id, updatedMember);
        
        setMembers(members.map(m => m.id === editingMember.id ? updatedMember : m));
        toast.success('Member updated');
      } else {
        const newMember: GulfFoodMember = {
          id: crypto.randomUUID(),
          ...form,
          createdAt: now,
          updatedAt: now
        };
        await addDoc(COLLECTION_NAME, newMember.id, newMember);
        
        setMembers([newMember, ...members]);
        toast.success('Member added');
      }

      setForm({ companyName: '', cityState: '', contactPerson: '', contactNumber: '', email: '', website: '', profile: '' });
      setShowAddModal(false);
      setEditingMember(null);
      setDuplicateWarning(null);
    } catch (error) {
      toast.error('Failed to save member');
      console.error(error);
    }
  };

  // Remaining CRUD functions omitted for brevity, logic identical to previous
  // Just replacing the rendering area for selection mode
  
  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Delete this member?')) return;
    try {
      await deleteDocData(COLLECTION_NAME, id);
      setMembers(members.filter(m => m.id !== id));
      toast.success('Deleted');
      setViewingMember(null);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (member: GulfFoodMember) => {
    setEditingMember(member);
    setForm({
      companyName: member.companyName,
      cityState: member.cityState,
      contactPerson: member.contactPerson,
      contactNumber: member.contactNumber,
      email: member.email,
      website: member.website,
      profile: member.profile
    });
    setShowAddModal(true);
    setViewingMember(null);
  };

  // ... (exportCSV and importCSV functions are identical to the previous answer)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading Directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gulfood Directory</h1>
            <p className="text-sm text-gray-500 mt-1">{members.length} members registered</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input type="file" ref={fileInputRef} accept=".csv" className="hidden" />
            
            {/* Selection Mode Toggles */}
            {isSelectionMode ? (
              <>
                <button
                  onClick={cancelSelectionMode}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                  Cancel Selection
                </button>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => setDeleteStep(1)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 shadow-sm transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedIds.length})
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsSelectionMode(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <CheckSquare size={16} />
                Select Multiple
              </button>
            )}

            {!isSelectionMode && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload size={16} />
                  Import
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={() => {
                    setEditingMember(null);
                    setForm({ companyName: '', cityState: '', contactPerson: '', contactNumber: '', email: '', website: '', profile: '' });
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
                >
                  <Plus size={16} />
                  Add Member
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by company name, city, contact person, product profile..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          {isSelectionMode && filtered.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap bg-rose-50 px-4 py-3 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.length === filtered.length && filtered.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
              />
              <span className="font-medium text-rose-700">Select All</span>
            </label>
          )}
        </div>
        
        {search && (
          <p className="text-xs text-gray-500 mb-4 px-2">
            Found {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
          </p>
        )}

        {/* Members Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No members found</p>
            {members.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">Import a CSV file or add members manually</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => {
              const isSelected = selectedIds.includes(member.id);

              return (
                <div
                  key={member.id}
                  onClick={() => handleCardClick(member)}
                  className={`bg-white border rounded-2xl p-5 transition-all cursor-pointer group ${
                    isSelected ? 'border-rose-500 shadow-md bg-rose-50/50 scale-[0.99]' : 'border-gray-200 hover:shadow-md hover:border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3 items-start w-full">
                      {isSelectionMode && (
                        <div onClick={(e) => e.stopPropagation()} className="pt-1 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(member.id)}
                            className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors line-clamp-2 flex-1">
                        {member.companyName}
                      </h3>
                    </div>
                  </div>

                  <div className={`space-y-2 text-sm ${isSelectionMode ? "pl-7" : ""}`}>
                    {member.cityState && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <MapPin size={14} />
                        <span>{member.cityState}</span>
                      </div>
                    )}

                    {member.contactPerson && (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <User size={14} className="text-gray-400" />
                        <span className="font-medium">{member.contactPerson}</span>
                      </div>
                    )}

                    {member.contactNumber && (
                      <a
                        href={`tel:${member.contactNumber.replace(/\s/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700"
                      >
                        <Phone size={14} />
                        <span>{member.contactNumber}</span>
                      </a>
                    )}

                    {member.profile && (
                      <div className="mt-3">
                        <span className="inline-block text-xs px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-medium line-clamp-2">
                          {member.profile}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Modals omitted for brevity, they remain identical to the previous answer */}
      </div>
    </div>
  );
}
