import { useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import { Plus, Search, Trash2, Edit2, Save, X } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export default function Notes() {
  const { contracts } = useAppStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const filtered = notes.filter((n: Note) => 
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      setNotes(notes.map((n: Note) => n.id === editing ? { ...n, ...form, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) } : n));
      setEditing(null);
    } else {
      setNotes([...notes, {
        id: `note-${Date.now()}`,
        ...form,
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString(),
      }]);
    }
    setForm({ title: '', content: '', tags: '' });
  };

  const handleEdit = (note: Note) => {
    setEditing(note.id);
    setForm({
      title: note.title,
      content: note.content,
      tags: (note.tags || []).join(', '),
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this note?')) return;
    setNotes(notes.filter((n: Note) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Keep track of important information</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {editing ? 'Edit Note' : 'Add New Note'}
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <textarea
            placeholder="Content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {editing ? 'Update' : 'Save'}
            </button>
            {editing && (
              <button
                onClick={() => { setEditing(null); setForm({ title: '', content: '', tags: '' }); }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-500">No notes found</p>
          </div>
        ) : (
          filtered.map((note: Note) => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{note.title}</h3>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{note.content}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {note.tags.map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
