import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNurseApp, defaultDiaryTemplates, toLocalDateStr } from '../../context/NurseAppContext';

const DRAFT_KEY = 'diary_draft';

const DiaryTab = () => {
  const {
    user, diaries, setDiaries,
    diaryTemplates, setDiaryTemplates,
    hiddenDefaultTemplates, setHiddenDefaultTemplates,
    todayMood, setTodayMood,
    moodHistory, setMoodHistory,
    shifts, showError,
  } = useNurseApp();

  const [newDiary, setNewDiary] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : { date: '', content: '' };
    } catch {
      return { date: '', content: '' };
    }
  });

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(newDiary));
  }, [newDiary]);
  const [editId, setEditId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');

  const addDiary = async () => {
    if (!newDiary.date || !newDiary.content) return;
    const { data, error } = await supabase.from('diaries')
      .insert({ user_id: user.id, date: newDiary.date, content: newDiary.content })
      .select().single();
    if (!error && data) {
      setDiaries(prev => [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setNewDiary({ date: '', content: '' });
      localStorage.removeItem(DRAFT_KEY);
    }
  };

  const deleteDiary = async (id) => {
    const { error } = await supabase.from('diaries').delete().eq('id', id);
    if (error) { showError('日記の削除に失敗しました'); return; }
    setDiaries(prev => prev.filter(d => d.id !== id));
  };

  const updateDiary = async (id, content) => {
    const { error } = await supabase.from('diaries').update({ content }).eq('id', id);
    if (error) { showError('日記の更新に失敗しました'); return; }
    setDiaries(prev => prev.map(d => d.id === id ? { ...d, content } : d));
    setEditId(null);
  };

  const insertTemplate = (template) => {
    const newContent = newDiary.content ? `${newDiary.content}\n${template}` : template;
    setNewDiary({ ...newDiary, content: newContent });
  };

  const addCustomTemplate = async () => {
    if (!newTemplate.trim()) return;
    const { data } = await supabase.from('diary_templates')
      .insert({ user_id: user.id, content: newTemplate.trim() })
      .select().single();
    if (data) setDiaryTemplates(prev => [...prev, { id: data.id, content: data.content }]);
    setNewTemplate('');
  };

  const deleteTemplate = async (id) => {
    const { error } = await supabase.from('diary_templates').delete().eq('id', id);
    if (error) { showError('テンプレートの削除に失敗しました'); return; }
    setDiaryTemplates(prev => prev.filter(t => t.id !== id));
  };

  const hideDefaultTemplate = async (templateContent) => {
    const { error } = await supabase.from('hidden_templates').insert({ user_id: user.id, content: templateContent });
    if (error) { showError('テンプレートの非表示設定に失敗しました'); return; }
    setHiddenDefaultTemplates(prev => [...prev, templateContent]);
  };

  const visibleDefaultTemplates = defaultDiaryTemplates.filter(t => !hiddenDefaultTemplates.includes(t));

  const moods = [
    { value: 1, emoji: '😔', label: 'つらい' },
    { value: 2, emoji: '😟', label: 'しんどい' },
    { value: 3, emoji: '😐', label: 'ふつう' },
    { value: 4, emoji: '🙂', label: 'まあまあ' },
    { value: 5, emoji: '😊', label: 'いい感じ' },
  ];

  const saveMood = async (value) => {
    const today = toLocalDateStr(new Date());
    const { error } = await supabase.from('mood_logs').upsert(
      { user_id: user.id, date: today, mood: value },
      { onConflict: 'user_id,date' }
    );
    if (error) { showError('気分の保存に失敗しました'); return; }
    setTodayMood(value);
    setMoodHistory(prev => {
      const filtered = prev.filter(m => m.date !== today);
      return [...filtered, { date: today, mood: value }].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const MOOD_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#facc15', 4: '#86efac', 5: '#22c55e' };

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = toLocalDateStr(d);
    const log = moodHistory.find(m => m.date === dateStr);
    return { date: dateStr, mood: log?.mood || null };
  });

  const loggedDays = days30.filter(d => d.mood !== null);
  const avgAllNum = loggedDays.length > 0
    ? loggedDays.reduce((sum, d) => sum + d.mood, 0) / loggedDays.length : null;
  const recent7 = days30.slice(-7).filter(d => d.mood !== null);
  const avg7Num = recent7.length > 0
    ? recent7.reduce((sum, d) => sum + d.mood, 0) / recent7.length : null;
  const avg7Color = avg7Num
    ? (avg7Num < 2.5 ? '#ef4444' : avg7Num < 3.5 ? '#f97316' : '#22c55e') : '#6366f1';
  const lowMoodWarning = days30.slice(-3).filter(d => d.mood !== null && d.mood <= 2).length >= 2;
  const last7Recorded = days30.slice(-7).filter(d => d.mood !== null);
  const extendedRedWarning = last7Recorded.length >= 5 && last7Recorded.filter(d => d.mood === 1).length >= 5;

  const tomorrowKey = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toLocalDateStr(d); })();
  const tomorrowIsOff = shifts[tomorrowKey] === 'off';

  const msgIndex = new Date().getDate() % 3;
  const lowMoodMessages = [
    '最近しんどそうです。無理しないで、ゆっくり休んでくださいね。',
    '少し疲れが出ているかも。今日は早めに休んでみて。',
    'しんどい時は休むのも仕事のうち。自分を労ってあげてね。',
  ];
  const extendedRedMessages = [
    { main: '誰かに気持ちを話してみることはできそう？', sub: '辛い気持ちは抱え込まなくていいんだよ。看護師さんだって、助けを求めていい。' },
    { main: '辛い日が続いているね。吐き出してもいいんだよ。', sub: '聞いてくれる人はいそう？ひとりで抱えないで。' },
    { main: 'ずっとがんばってきたんだね。', sub: '誰かに話すだけで、少し楽になることもあるよ。あなたの気持ちは大事だよ。' },
  ];

  return (
    <div className="space-y-4">
      {/* メンタルチェック */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3 text-indigo-800">今日の気分は？</h3>
        {todayMood ? (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-3xl">{moods.find(m => m.value === todayMood)?.emoji}</span>
            <span className="text-sm">今日は「{moods.find(m => m.value === todayMood)?.label}」と記録しました</span>
            <button onClick={() => setTodayMood(null)} className="ml-auto text-xs text-blue-500 hover:underline">変更</button>
          </div>
        ) : (
          <div className="flex justify-around">
            {moods.map(m => (
              <button key={m.value} onClick={() => saveMood(m.value)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-50 transition">
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-xs text-gray-500">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 気分グラフ */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3 text-indigo-800">気分の記録（過去30日）</h3>
        {loggedDays.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">まだ記録がありません。毎日の気分を記録してみましょう。</p>
        ) : (
          <>
            {extendedRedWarning && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 space-y-1.5">
                <p className="text-sm font-semibold text-red-700">💙 辛い日が続いているね</p>
                <p className="text-sm text-red-600">{extendedRedMessages[msgIndex].main}</p>
                <p className="text-sm text-red-500">{extendedRedMessages[msgIndex].sub}</p>
                {tomorrowIsOff && (
                  <p className="text-sm text-red-600 font-medium pt-1 border-t border-red-200">🛌 明日は休みだね、ゆっくり休もう。</p>
                )}
              </div>
            )}
            {!extendedRedWarning && lowMoodWarning && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-sm text-orange-700 flex items-start gap-2">
                <span>🌸</span>
                <div>
                  <p>{lowMoodMessages[msgIndex]}</p>
                  {tomorrowIsOff && (
                    <p className="font-medium mt-1">🛌 明日は休みだね、ゆっくり休もう。</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-6 mb-4">
              {avgAllNum && (
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-700">{avgAllNum.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">全体平均</div>
                </div>
              )}
              {avg7Num && (
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ color: avg7Color }}>{avg7Num.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">直近7日</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-xl">{moods.find(m => m.value === Math.round(avgAllNum))?.emoji || '😐'}</div>
                <div className="text-xs text-gray-500">全体の傾向</div>
              </div>
            </div>
            <div className="flex items-end gap-px h-16 mb-1">
              {days30.map(d => (
                <div key={d.date} className="flex-1 flex flex-col justify-end h-full">
                  {d.mood ? (
                    <div
                      style={{ height: `${(d.mood / 5) * 100}%`, backgroundColor: MOOD_COLORS[d.mood] }}
                      className="w-full rounded-t-sm"
                      title={`${d.date}: ${moods.find(m => m.value === d.mood)?.label}`}
                    />
                  ) : (
                    <div className="w-full h-1 bg-gray-100 rounded-sm" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mb-3">
              <span>30日前</span>
              <span>今日</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {moods.map(m => (
                <span key={m.value} className="flex items-center gap-1 text-xs text-gray-500">
                  <span style={{ backgroundColor: MOOD_COLORS[m.value] }} className="w-2.5 h-2.5 rounded-sm inline-block" />
                  {m.emoji} {m.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-3">新しい日記</h3>
        <input type="date" value={newDiary.date}
          onChange={(e) => setNewDiary({ ...newDiary, date: e.target.value })}
          className="w-full p-2 border rounded mb-2" />
        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">例文を使う</label>
            <button onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-blue-500 hover:text-blue-700">
              {showTemplates ? '閉じる' : '例文を表示'}
            </button>
          </div>
          {showTemplates && (
            <div className="mb-2 p-3 bg-gray-50 rounded border">
              <div className="flex flex-wrap gap-2 mb-3">
                {visibleDefaultTemplates.map((template, index) => (
                  <div key={`default-${index}`} className="relative group">
                    <button onClick={() => insertTemplate(template)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">{template}</button>
                    <button onClick={() => hideDefaultTemplate(template)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                  </div>
                ))}
                {diaryTemplates.map((template) => (
                  <div key={template.id} className="relative group">
                    <button onClick={() => insertTemplate(template.content)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">{template.content}</button>
                    <button onClick={() => deleteTemplate(template.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="新しい例文を追加..." className="flex-1 p-2 border rounded text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTemplate()} />
                <button onClick={addCustomTemplate} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm">追加</button>
              </div>
            </div>
          )}
        </div>
        <textarea value={newDiary.content} onChange={(e) => setNewDiary({ ...newDiary, content: e.target.value })}
          placeholder="今日の出来事や気づきを記録..." className="w-full p-2 border rounded h-24 mb-1" />
        <p className="text-xs text-red-400 mb-2">⚠️ 患者氏名・IDなどの個人情報は入力しないでください</p>
        <button onClick={addDiary} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus size={16} /> 保存
        </button>
      </div>
      <div className="space-y-2">
        {diaries.map(diary => (
          <div key={diary.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-600">{diary.date}</span>
              <div className="flex gap-2">
                <button onClick={() => { const next = editId === diary.id ? null : diary.id; setEditId(next); if (next) setEditContent(diary.content); }} className="text-blue-500 hover:text-blue-700">
                  {editId === diary.id ? <X size={16} /> : <Edit2 size={16} />}
                </button>
                <button onClick={() => deleteDiary(diary.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
              </div>
            </div>
            {editId === diary.id ? (
              <div>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-2 border rounded h-24 mb-2" />
                <button onClick={() => updateDiary(diary.id, editContent)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center gap-1">
                  <Save size={14} /> 更新
                </button>
              </div>
            ) : (
              <p className="text-gray-800 whitespace-pre-wrap">{diary.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiaryTab;
