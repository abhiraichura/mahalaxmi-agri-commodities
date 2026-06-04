import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, X, Tag, Trash2, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { BusinessNote } from '../types';

export default function Notes() {
  const { addNote, updateNote, deleteNote, notes } = useAppStore();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [editing, setEditing] = useState<BusinessNote | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    const matchesSearch = n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchesTag = !tagFilter || (n.tags || []).includes(tagFilter);
    return matchesSearch && matchesTag;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content required');
      return;
    }
    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (editing) {
      await updateNote(editing.id, data);
      toast.success('Note updated');
    } else {
      await addNote({ ...data, id: uuidv4(), createdAt: new Date().toISOString() } as BusinessNote);
      toast.success('Note added');
    }
    setForm({ title: '', content: '', tags: '' });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (n: BusinessNote) => {
    setEditing(n);
    setForm({ title: n.title, content: n.content, tags: (n.tags || []).join(', ') });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteNote(id);
    toast.success('Deleted');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Notes</h1>
          <p className="text-sm text-gray-500">Quick memos, searchable</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: '', content: '', tags: '' }); }}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-rose-700">
          <Plus size={16} /> Add Note
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..." autoFocus
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm" />
        </div>
        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="">All Tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit Note' : 'New Note'}</h2>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium" />
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            rows={4} placeholder="What's on your mind?" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none" />
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-gray-400" />
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags (comma separated)" className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-700">
              {editing ? 'Update' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {filtered.map(note => (
          <div key={note.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow group">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{note.title}</h3>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-2 mt-3">
                  {(note.tags || []).map(t => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{t}</span>
                  ))}
                  <span className="text-xs text-gray-400">
                    {new Date(note.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(note)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Edit3 size={16} className="text-gray-500" />
                </button>
                <button onClick={() => handleDelete(note.id)} className="p-2 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{search ? 'No notes match your search' : 'No notes yet'}</p>
        </div>
      )}
    </div>
  );
}
