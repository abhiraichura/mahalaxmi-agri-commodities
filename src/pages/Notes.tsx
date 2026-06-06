import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Search, Plus, X, Trash2, Edit2, Save, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useAppStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) ||
           (n.content || '').toLowerCase().includes(q) ||
           (n.tags || []).some(t => t.toLowerCase().includes(q));
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      id: editing || uuidv4(),
      title: form.title,
      content: form.content,
      tags,
      updatedAt: new Date().toISOString(),
      createdAt: editing ? notes.find(n => n.id === editing)?.createdAt : new Date().toISOString()
    };

    try {
      if (editing) {
        await updateNote(editing, payload);
        toast.success('Note updated');
      } else {
        await addNote(payload);
        toast.success('Note added');
      }
      setEditing(null);
      setForm({ title: '', content: '', tags: '' });
    } catch {
      toast.error('Failed to save');
    }
  };

  const startEdit = (note: any) => {
    setEditing(note.id);
    setForm({
      title: note.title,
      content: note.content,
      tags: (note.tags || []).join(', ')
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteNote(id);
    toast.success('Deleted');
    if (editing === id) {
      setEditing(null);
      setForm({ title: '', content: '', tags: '' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Business Notes</h1>
        <span className="text-sm text-gray-500">{notes.length} notes</span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes instantly..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm"
        />
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-rose-600" />
          <h3 className="font-semibold text-sm">{editing ? 'Edit Note' : 'Quick Add Note'}</h3>
        </div>
        <div className="space-y-3">
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <textarea
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Note content..."
            rows={3}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <input
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags (comma separated)"
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
            >
              <Save className="w-4 h-4" /> {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button
                onClick={() => { setEditing(null); setForm({ title: '', content: '', tags: '' }); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No notes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{note.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.content}</p>
                  {(note.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {note.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => startEdit(note)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
