// src/pages/GulfFoodDirectory.tsx
import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Phone, Mail, MapPin, Globe, User, X, Download, Upload, FileText, Trash2, Edit2, ExternalLink, AlertTriangle } from 'lucide-react';
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

  const executeBulkDelete = async () => {
    toast.loading('Deleting members...');
    try {
      for (const id of selectedIds) {
        await deleteDocData(COLLECTION_NAME, id);
      }
      setMembers(members.filter(m => !selectedIds.includes(m.id)));
      toast.dismiss();
      toast.success(`Successfully deleted ${selectedIds.length} members`);
      setSelectedIds([]);
      setDeleteStep(0);
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

  const exportCSV = () => {
    const headers = ['Company Name', 'City - State', 'Contact Person Name', 'Contact Number', 'Email', 'Website', 'Profile'];
    const rows = members.map(m => [
      m.companyName,
      m.cityState,
      m.contactPerson,
      m.contactNumber,
      m.email,
      m.website,
      m.profile
    ]);

    const csv = [headers.join(','), ...rows.map(r =>
      r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )].join("\n");

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gulfood_directory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('CSV is empty');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const now = new Date().toISOString();
      let count = 0;
      
      toast.loading('Importing members...');

      const newMembersList = [...members];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        if (!row['Company Name']) continue;

        const newMember: GulfFoodMember = {
          id: crypto.randomUUID(),
          companyName: row['Company Name'] || '',
          cityState: row['City - State'] || '',
          contactPerson: row['Contact Person Name'] || '',
          contactNumber: row['Contact Number'] || '',
          email: row['Email'] || '',
          website: row['Website'] || '',
          profile: row['Profile'] || '',
          createdAt: now,
          updatedAt: now
        };

        try {
          await addDoc(COLLECTION_NAME, newMember.id, newMember);
          newMembersList.push(newMember);
          count++;
        } catch (error) {
          console.error('Error importing row:', error);
        }
      }

      setMembers(newMembersList);
      toast.dismiss();
      toast.success(`Imported ${count} members`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

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
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={importCSV}
              className="hidden"
            />
            {selectedIds.length > 0 && (
              <button
                onClick={() => setDeleteStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={exportCSV}
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
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.length === filtered.length && filtered.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
              />
              <span className="font-medium">Select All</span>
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
                  onClick={() => setViewingMember(member)}
                  className={`bg-white border rounded-2xl p-5 transition-all cursor-pointer group ${
                    isSelected ? 'border-rose-500 shadow-sm bg-rose-50/30' : 'border-gray-200 hover:shadow-md hover:border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3 items-start">
                      <div onClick={(e) => e.stopPropagation()} className="pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(member.id)}
                          className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors line-clamp-2">
                        {member.companyName}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm pl-7">
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

        {/* View Member Modal */}
        {viewingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewingMember(null)}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{viewingMember.companyName}</h2>
                <button onClick={() => setViewingMember(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {viewingMember.cityState && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-gray-700">{viewingMember.cityState}</span>
                  </div>
                )}

                {viewingMember.contactPerson && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl">
                    <User size={16} className="text-rose-600" />
                    <div>
                      <p className="font-medium text-gray-900">{viewingMember.contactPerson}</p>
                      <p className="text-xs text-gray-500">Contact Person</p>
                    </div>
                  </div>
                )}

                {viewingMember.contactNumber && (
                  <a href={`tel:${viewingMember.contactNumber.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm text-rose-600 hover:underline">
                    <Phone size={16} />
                    {viewingMember.contactNumber}
                  </a>
                )}

                {viewingMember.email && (
                  <a href={`mailto:${viewingMember.email}`} className="flex items-center gap-2 text-sm text-rose-600 hover:underline">
                    <Mail size={16} />
                    {viewingMember.email}
                  </a>
                )}

                {viewingMember.website && (
                  <a
                    href={viewingMember.website.startsWith('http') ? viewingMember.website : `https://${viewingMember.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-rose-600 hover:underline"
                  >
                    <Globe size={16} />
                    {viewingMember.website}
                    <ExternalLink size={12} />
                  </a>
                )}

                {viewingMember.profile && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs font-medium text-gray-500 mb-1">Profile / Products</p>
                    <p className="text-sm text-gray-800">{viewingMember.profile}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(viewingMember)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSingle(viewingMember.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingMember ? 'Edit Member' : 'Add New Member'}
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* Form Block */}
              {!duplicateWarning ? (
                <form onSubmit={handleInitialSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={e => setForm({ ...form, companyName: e.target.value })}
                      placeholder="Company Name"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City - State</label>
                    <input
                      type="text"
                      value={form.cityState}
                      onChange={e => setForm({ ...form, cityState: e.target.value })}
                      placeholder="e.g. Mumbai, Maharashtra"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={form.contactPerson}
                        onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                        placeholder="Contact Person Name"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={form.contactNumber}
                        onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                        placeholder="+91 ..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="email@company.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="text"
                      value={form.website}
                      onChange={e => setForm({ ...form, website: e.target.value })}
                      placeholder="www.company.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile / Products</label>
                    <textarea
                      value={form.profile}
                      onChange={e => setForm({ ...form, profile: e.target.value })}
                      placeholder="e.g. Dairy Products, Instant Coffee, Tea..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
                    >
                      {editingMember ? 'Update' : 'Add'} Member
                    </button>
                  </div>
                </form>
              ) : (
                /* Duplicate Warning View inside the Modal */
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} className="text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Duplicate Contact</h3>
                  <p className="text-gray-600 mb-6">
                    This contact number already exists with <strong>{duplicateWarning.matchedName}</strong>. Do you still want to save it?
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setDuplicateWarning(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel / Edit
                    </button>
                    <button
                      onClick={executeSave}
                      className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                    >
                      {editingMember ? 'Update Anyhow' : 'Create New Member Anyhow'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Double Confirmation Bulk Delete Modal */}
        {deleteStep > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              
              {deleteStep === 1 ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Delete {selectedIds.length} Members?</h3>
                  <p className="text-gray-500 mb-6">
                    Are you sure you want to delete the selected members from the Gulfood directory?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-red-600 mb-2">Final Confirmation</h3>
                  <p className="text-gray-600 mb-6">
                    This action is <strong>irreversible</strong>. You are about to permanently delete {selectedIds.length} records. Please confirm again.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeBulkDelete}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                    >
                      Permanently Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
