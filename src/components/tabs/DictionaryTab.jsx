import React, { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNurseApp } from '../../context/NurseAppContext';

const DictionaryTab = () => {
  const {
    user, terms, setTerms,
    searchTerm, setSearchTerm,
    showError, termToState,
  } = useNurseApp();

  const [newTerm, setNewTerm] = useState({ term: '', full: '', meaning: '' });

  const addTerm = async () => {
    if (!newTerm.term || !newTerm.meaning) return;
    const { data, error } = await supabase.from('medical_terms').insert({
      user_id: user.id, term: newTerm.term, full_name: newTerm.full, meaning: newTerm.meaning,
    }).select().single();
    if (!error && data) {
      setTerms(prev => [...prev, termToState(data)].sort((a, b) => a.term.localeCompare(b.term)));
      setNewTerm({ term: '', full: '', meaning: '' });
    }
  };

  const deleteTerm = async (id) => {
    const { error } = await supabase.from('medical_terms').delete().eq('id', id);
    if (error) { showError('用語の削除に失敗しました'); return; }
    setTerms(prev => prev.filter(t => t.id !== id));
  };

  const filteredTerms = terms.filter(t =>
    t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.full && t.full.toLowerCase().includes(searchTerm.toLowerCase())) ||
    t.meaning.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="用語を検索..." className="w-full pl-10 p-2 border rounded" />
        </div>
        <h3 className="font-semibold mb-3">新しい用語を追加</h3>
        <input type="text" value={newTerm.term} onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
          placeholder="略語（例：BP）" className="w-full p-2 border rounded mb-2" />
        <input type="text" value={newTerm.full} onChange={(e) => setNewTerm({ ...newTerm, full: e.target.value })}
          placeholder="正式名称（任意）" className="w-full p-2 border rounded mb-2" />
        <input type="text" value={newTerm.meaning} onChange={(e) => setNewTerm({ ...newTerm, meaning: e.target.value })}
          placeholder="意味" className="w-full p-2 border rounded mb-2" />
        <button onClick={addTerm} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus size={16} /> 追加
        </button>
      </div>
      <div className="space-y-2">
        {filteredTerms.map(term => (
          <div key={term.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg text-blue-600">{term.term}</div>
                {term.full && <div className="text-sm text-gray-600 italic">{term.full}</div>}
                <div className="text-gray-800 mt-1">{term.meaning}</div>
              </div>
              <button onClick={() => deleteTerm(term.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DictionaryTab;
