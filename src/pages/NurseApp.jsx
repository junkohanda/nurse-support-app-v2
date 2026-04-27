import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Calendar, BookOpen, Clock, Plus, Search, Trash2, Edit2, Save, X,
  ChevronLeft, ChevronRight, Settings, Newspaper, RefreshCw, CheckSquare, Book, LogOut
} from 'lucide-react';

const NurseApp = ({ user, onSignOut, onShowPrivacy }) => {
  const [activeTab, setActiveTab] = useState('diary');
  const [diaries, setDiaries] = useState([]);
  const [shifts, setShifts] = useState({});
  const [terms, setTerms] = useState([]);
  const [todos, setTodos] = useState([]);
  const [studyNotes, setStudyNotes] = useState([]);
  const [diaryTemplates, setDiaryTemplates] = useState([]); // [{id, content}]
  const [hiddenDefaultTemplates, setHiddenDefaultTemplates] = useState([]); // [content文字列]
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [userSettings, setUserSettings] = useState({
    profession: '',
    department: '',
    shiftSystem: '2',
    customShifts: [],
    shiftTimes: {
      day:       { start: '08:00', end: '16:30' },
      night:     { start: '16:00', end: '09:00' },
      evening:   { start: '16:00', end: '24:30' },
      lateNight: { start: '00:00', end: '08:30' },
      am:        { start: '08:00', end: '12:00' },
      pm:        { start: '12:00', end: '16:30' },
      late:      { start: '12:00', end: '20:30' },
      early:     { start: '07:00', end: '15:30' },
    }
  });
  const [newsArticles, setNewsArticles] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [todayMood, setTodayMood] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [activeShiftType, setActiveShiftType] = useState(null);
  const [shiftSubTab, setShiftSubTab] = useState('input');
  const [seqDate, setSeqDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const shiftSeqDate = (dateStr, delta) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + delta);
    return d.toISOString().split('T')[0];
  };

  const initialTerms = [
    { term: 'BP',   full_name: 'Blood Pressure',                      meaning: '血圧' },
    { term: 'HR',   full_name: 'Heart Rate',                          meaning: '心拍数' },
    { term: 'RR',   full_name: 'Respiratory Rate',                    meaning: '呼吸数' },
    { term: 'SpO2', full_name: 'Saturation of Percutaneous Oxygen',   meaning: '経皮的動脈血酸素飽和度' },
    { term: 'BT',   full_name: 'Body Temperature',                    meaning: '体温' },
    { term: 'ICU',  full_name: 'Intensive Care Unit',                 meaning: '集中治療室' },
    { term: 'ER',   full_name: 'Emergency Room',                      meaning: '救急室' },
    { term: 'NPO',  full_name: 'Nil Per Os',                          meaning: '絶食' },
    { term: 'IV',   full_name: 'Intravenous',                         meaning: '静脈内' },
    { term: 'IM',   full_name: 'Intramuscular',                       meaning: '筋肉内' },
  ];

  const defaultDiaryTemplates = [
    '疲れた', '充実した一日だった', '大変だったけど学びが多かった',
    'インシデントがあった', '患者さんに感謝された',
    '夜勤明けで眠い', 'チームワークが良かった', '忙しすぎた',
  ];

  // =====================================================
  // データ読み込み（Supabase から全データを取得）
  // =====================================================
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const uid = user.id;
    const today = new Date().toISOString().split('T')[0];
    const [diariesRes, shiftsRes, termsRes, settingsRes, todosRes, studyRes, templatesRes, hiddenRes, moodRes] = await Promise.all([
      supabase.from('diaries').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('shifts').select('*').eq('user_id', uid),
      supabase.from('medical_terms').select('*').eq('user_id', uid).order('term'),
      supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('todos').select('*').eq('user_id', uid).order('due_date'),
      supabase.from('study_notes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('diary_templates').select('*').eq('user_id', uid),
      supabase.from('hidden_templates').select('*').eq('user_id', uid),
      supabase.from('mood_logs').select('*').eq('user_id', uid).eq('date', today).maybeSingle(),
    ]);

    setDiaries(diariesRes.data || []);

    // shifts: 配列 → {date: shift_type} オブジェクトに変換
    const shiftsObj = {};
    (shiftsRes.data || []).forEach(s => { shiftsObj[s.date] = s.shift_type; });
    setShifts(shiftsObj);

    // 医療用語：初回は初期データを挿入（重複しないよう upsert）
    if ((termsRes.data || []).length === 0) {
      const toInsert = initialTerms.map(t => ({ ...t, user_id: uid }));
      await supabase.from('medical_terms').upsert(toInsert, { onConflict: 'user_id,term', ignoreDuplicates: true });
      const { data: inserted } = await supabase.from('medical_terms').select('*').eq('user_id', uid).order('term');
      setTerms((inserted || []).map(termToState));
    } else {
      setTerms((termsRes.data || []).map(termToState));
    }

    // 設定：初回はデフォルト値を挿入
    if (settingsRes.data) {
      setUserSettings(settingsToState(settingsRes.data));
    } else {
      const defaultSettings = {
        user_id: uid,
        profession: '',
        department: '',
        shift_system: '2',
        shift_times: userSettings.shiftTimes,
      };
      await supabase.from('user_settings').insert(defaultSettings);
    }

    // todos: snake_case → camelCase
    setTodos((todosRes.data || []).map(todoToState));

    // study_notes: snake_case → camelCase
    setStudyNotes((studyRes.data || []).map(noteToState));

    // diary_templates: {id, content} の配列
    setDiaryTemplates((templatesRes.data || []).map(t => ({ id: t.id, content: t.content })));

    // hidden_templates: content 文字列の配列
    setHiddenDefaultTemplates((hiddenRes.data || []).map(t => t.content));

    // 今日の気分ログ
    if (moodRes.data) setTodayMood(moodRes.data.mood);

    // 初回ログイン時の警告（日記が0件かつ確認済みフラグがなければ表示）
    const warned = localStorage.getItem(`privacy-warned-${uid}`);
    if (!warned) setShowWarning(true);
  };

  // =====================================================
  // 変換ヘルパー（Supabase snake_case ↔ UI camelCase）
  // =====================================================
  const termToState    = (t) => ({ id: t.id, term: t.term, full: t.full_name, meaning: t.meaning });
  const settingsToState = (s) => ({
    profession: s.profession, department: s.department,
    shiftSystem: s.shift_system, shiftTimes: s.shift_times,
    customShifts: s.custom_shifts || [],
  });
  const todoToState = (t) => ({
    id: t.id, title: t.title, description: t.description,
    dueDate: t.due_date, priority: t.priority,
    completed: t.completed, fromStudyNote: t.from_study_note,
  });
  const noteToState = (n) => ({
    id: n.id, title: n.title, category: n.category,
    middleCategory: n.middle_category, smallCategory: n.small_category,
    content: n.content, reviewDate: n.review_date,
    createdAt: n.created_at,
  });

  // =====================================================
  // シフト定義・カラーパレット
  // =====================================================
  const SHIFT_COLORS = [
    { key: 'red',     bg: '#fecaca', cls: 'bg-red-100 text-red-800 border-red-300' },
    { key: 'lime',    bg: '#d9f99d', cls: 'bg-lime-100 text-lime-800 border-lime-300' },
    { key: 'sky',     bg: '#e0f2fe', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
    { key: 'hotpink', bg: '#f0abfc', cls: 'bg-fuchsia-300 text-fuchsia-900 border-fuchsia-400' },
    { key: 'cream',   bg: '#fffbeb', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'peach',   bg: '#fed7aa', cls: 'bg-orange-200 text-orange-800 border-orange-300' },
    { key: 'blue',    bg: '#93c5fd', cls: 'bg-blue-300 text-blue-900 border-blue-400' },
    { key: 'gray',    bg: '#d1d5db', cls: 'bg-gray-300 text-gray-700 border-gray-400' },
  ];

  const getShiftTypes = () => {
    const t = userSettings.shiftTimes || {};
    const lbl = (id, def) => t[id]?.label || def;
    const commonShifts = [
      { id: 'day',   label: lbl('day',   '日勤'), color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      { id: 'am',    label: lbl('am',    'AM'),   color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
      { id: 'pm',    label: lbl('pm',    'PM'),   color: 'bg-orange-100 text-orange-800 border-orange-300' },
      { id: 'late',  label: lbl('late',  '遅出'), color: 'bg-amber-100 text-amber-800 border-amber-300' },
      { id: 'early', label: lbl('early', '早出'), color: 'bg-pink-100 text-pink-800 border-pink-300' },
      { id: 'off',   label: lbl('off',   '休み'), color: 'bg-green-100 text-green-800 border-green-300' },
    ];
    let base;
    if (userSettings.shiftSystem === '3') {
      base = [
        commonShifts[0],
        { id: 'evening',   label: lbl('evening',   '準夜勤'), color: 'bg-purple-100 text-purple-800 border-purple-300' },
        { id: 'lateNight', label: lbl('lateNight', '深夜勤'), color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        ...commonShifts.slice(1),
      ];
    } else {
      base = [
        commonShifts[0],
        { id: 'night', label: lbl('night', '夜勤'), color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        ...commonShifts.slice(1),
      ];
    }
    const custom = (userSettings.customShifts || []).map(cs => ({
      id: cs.id,
      label: cs.label,
      color: SHIFT_COLORS.find(c => c.key === cs.color)?.cls || 'bg-gray-100 text-gray-800 border-gray-300',
    }));
    return [...base, ...custom];
  };
  const shiftTypes = getShiftTypes();

  const professions = ['看護師', '助産師', '准看護師', 'その他'];
  const departments = [
    '脳外科', '神経内科', '脳血管内治療科', '小児科', 'NICU',
    '消化器内科', '消化器外科', '循環器内科', '循環器外科',
    '整形外科', '産婦人科', 'ICU', '腎臓内科', '内分泌科',
    '呼吸器内科', '呼吸器外科', '血液内科', '精神科', '形成外科',
    'アレルギー膠原病科', '泌尿器科', '眼科', '皮膚科', '耳鼻咽喉科',
    '放射線科', '救急外来', '手術室', '透析室', '内視鏡室', 'その他外来', 'その他',
  ];
  const studyCategories = ['疾患', '看護技術', '薬剤知識', '検査', '医療機器', '処置', 'その他'];
  const diseaseMiddleCategories = [
    '脳外科', '神経内科', '脳血管内治療科', '小児科', 'NICU',
    '消化器内科', '消化器外科', '循環器内科', '循環器外科',
    '整形外科', '産婦人科', 'ICU', '腎臓内科', '内分泌科',
    '呼吸器内科', '呼吸器外科', '血液内科', '精神科', '形成外科',
    'アレルギー膠原病科', '泌尿器科', '眼科', '皮膚科', '耳鼻咽喉科',
    '放射線科', '救急外来', '手術室', '透析室', '内視鏡', 'その他外来',
  ];
  const getSmallCategories = (middle) => {
    if (middle === '産婦人科') return ['急性疾患','慢性疾患','悪性腫瘍','感染症','正常分娩','異常分娩','流産','不妊症','その他'];
    if (middle === '手術室')   return ['外回り','器械出し','麻酔管理・全身管理','術前術後訪問','その他'];
    if (middle === '透析室')   return ['透析原理・機器','ブラッドアクセス','観察・トラブル対応','検査値と食事・生活指導','その他'];
    if (middle === '放射線科') return ['検査','処置','放射線治療','その他'];
    if (middle === '内視鏡')   return ['検査','治療','その他'];
    if (middle === '救急外来') return ['急性疾患','外傷','小児','その他'];
    return ['急性疾患','慢性疾患','悪性腫瘍','自己免疫疾患','感染症','その他'];
  };

  // =====================================================
  // 日記タブ
  // =====================================================
  const DiaryTab = () => {
    const [newDiary, setNewDiary] = useState({ date: '', content: '' });
    const [editId, setEditId] = useState(null);
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
      }
    };

    const deleteDiary = async (id) => {
      await supabase.from('diaries').delete().eq('id', id);
      setDiaries(prev => prev.filter(d => d.id !== id));
    };

    const updateDiary = async (id, content) => {
      await supabase.from('diaries').update({ content }).eq('id', id);
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
      await supabase.from('diary_templates').delete().eq('id', id);
      setDiaryTemplates(prev => prev.filter(t => t.id !== id));
    };

    const hideDefaultTemplate = async (templateContent) => {
      await supabase.from('hidden_templates').insert({ user_id: user.id, content: templateContent });
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
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('mood_logs').upsert(
        { user_id: user.id, date: today, mood: value },
        { onConflict: 'user_id,date' }
      );
      setTodayMood(value);
    };

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
                  <button onClick={() => setEditId(editId === diary.id ? null : diary.id)} className="text-blue-500 hover:text-blue-700">
                    {editId === diary.id ? <X size={16} /> : <Edit2 size={16} />}
                  </button>
                  <button onClick={() => deleteDiary(diary.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
              </div>
              {editId === diary.id ? (
                <div>
                  <textarea defaultValue={diary.content} id={`edit-${diary.id}`} className="w-full p-2 border rounded h-24 mb-2" />
                  <button onClick={() => updateDiary(diary.id, document.getElementById(`edit-${diary.id}`).value)}
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

  // =====================================================
  // シフトタブ
  // =====================================================
  const ShiftTab = () => {
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const days = [];
      for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
      for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
      return days;
    };

    const formatDateKey = (year, month, day) =>
      `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const handleDayClick = (day) => {
      if (!day) return;
      const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      setSeqDate(dateKey);
      setSelectedDate(null);
    };

    const applyShiftAndAdvance = async (shiftId) => {
      if (shiftId === 'clear') {
        await clearShift(seqDate);
      } else {
        await selectShift(seqDate, shiftId);
      }
      setSeqDate(shiftSeqDate(seqDate, 1));
    };

    const selectShift = async (dateKey, shiftId) => {
      await supabase.from('shifts').upsert(
        { user_id: user.id, date: dateKey, shift_type: shiftId },
        { onConflict: 'user_id,date' }
      );
      setShifts(prev => ({ ...prev, [dateKey]: shiftId }));
    };

    const clearShift = async (dateKey) => {
      await supabase.from('shifts').delete().eq('user_id', user.id).eq('date', dateKey);
      setShifts(prev => { const n = { ...prev }; delete n[dateKey]; return n; });
    };

    const changeMonth = (delta) => {
      const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
      setCurrentMonth(newMonth);
      setSeqDate(`${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, '0')}-01`);
      setSelectedDate(null);
    };

    const getTodosForDate = (dateKey) => todos.filter(t => t.dueDate === dateKey && !t.completed);

    const getOverdueTodos = () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return todos.filter(t => !t.completed && new Date(t.dueDate) < today);
    };

    const overdueTodos = getOverdueTodos();
    const days = getDaysInMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 夜勤後メッセージ：昨日が夜勤・深夜勤だったか確認
    const getNightShiftMessage = () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().split('T')[0];
      const yShift = shifts[yKey];
      if (yShift === 'night' || yShift === 'lateNight' || yShift === 'evening') {
        return '昨日は夜勤でしたね。ゆっくり休めていますか？無理しすぎないでください。';
      }
      const todayKey = new Date().toISOString().split('T')[0];
      const todayShift = shifts[todayKey];
      if (todayShift === 'night' || todayShift === 'evening') {
        return '今日は夜勤ですね。無理せず、良い勤務になりますように。';
      }
      return null;
    };
    const nightShiftMessage = getNightShiftMessage();

    const CalendarView = () => (
      <div className="space-y-4">
        {nightShiftMessage && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-indigo-800 text-sm flex items-start gap-2">
            <span className="text-xl">🌙</span>
            <p>{nightShiftMessage}</p>
          </div>
        )}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
            <h3 className="font-bold text-lg">{year}年 {month + 1}月</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['日','月','火','水','木','金','土'].map(d => (
              <div key={d} className="text-center font-semibold text-sm py-2 text-gray-600">{d}</div>
            ))}
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
              const dateKey = formatDateKey(year, month, day);
              const shiftType = shifts[dateKey];
              const shiftInfo = shiftTypes.find(s => s.id === shiftType);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const hasTodos = getTodosForDate(dateKey).length > 0;
              return (
                <button key={day} onClick={() => handleDayClick(day)}
                  className={`aspect-square border rounded p-1 hover:bg-gray-50 transition relative ${isToday ? 'ring-2 ring-blue-500' : ''} ${shiftInfo ? shiftInfo.color : 'bg-white'}`}>
                  <div className="text-sm font-semibold">{day}</div>
                  {shiftInfo && <div className="text-xs mt-0.5">{shiftInfo.label}</div>}
                  {hasTodos && <div className="absolute bottom-1 right-1 w-2 h-2 bg-black rounded-full"></div>}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-gray-400 text-center">日付をタップしてカーソルを移動できます</div>
          {overdueTodos.length > 0 && (
            <div className={`mt-4 border rounded p-3 ${overdueTodos.some(t => t.priority === 'high') ? 'bg-red-100 border-red-500' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <span className="font-semibold">
                  {overdueTodos.some(t => t.priority === 'high') ? '🚨 緊急！ ' : '⚠️ '}
                  未完了のToDoがあります（{overdueTodos.length}件）
                </span>
              </div>
              <div className="space-y-1">
                {overdueTodos.slice(0, 3).map(todo => (
                  <div key={todo.id} className={`text-xs ${todo.priority === 'high' ? 'text-red-800 font-semibold' : 'text-red-600'}`}>
                    {todo.priority === 'high' && '🔴 '}• {todo.title}（期限: {todo.dueDate}）
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const InputView = () => (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft size={20} /></button>
            <h3 className="font-bold text-base">{year}年 {month + 1}月</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['日','月','火','水','木','金','土'].map(d => (
              <div key={d} className="text-center font-semibold text-xs py-1 text-gray-500">{d}</div>
            ))}
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
              const dateKey = formatDateKey(year, month, day);
              const shiftType = shifts[dateKey];
              const shiftInfo = shiftTypes.find(s => s.id === shiftType);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const isSeqCursor = dateKey === seqDate;
              return (
                <button key={day} onClick={() => handleDayClick(day)}
                  className={`aspect-square border rounded p-0.5 transition relative ${isSeqCursor ? 'ring-2 ring-indigo-500' : isToday ? 'ring-2 ring-blue-400' : ''} ${shiftInfo ? shiftInfo.color : 'bg-white'}`}>
                  <div className="text-xs font-semibold">{day}</div>
                  {shiftInfo && <div className="text-xs leading-none">{shiftInfo.label}</div>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="text-center mb-4 py-3 bg-indigo-50 rounded-lg">
            <div className="font-bold text-xl text-indigo-900">
              {new Date(seqDate + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
            {shifts[seqDate] ? (
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${shiftTypes.find(s => s.id === shifts[seqDate])?.color}`}>
                {shiftTypes.find(s => s.id === shifts[seqDate])?.label} 入力済み
              </span>
            ) : (
              <span className="text-xs text-gray-400">未入力</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {shiftTypes.map(shift => (
              <button key={shift.id} onClick={() => applyShiftAndAdvance(shift.id)}
                className={`py-4 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${shift.color} hover:opacity-80 shadow-sm`}>
                {shift.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSeqDate(shiftSeqDate(seqDate, 1))}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-sm text-gray-400 font-medium hover:bg-gray-50 active:scale-95">
            スキップ（次の日へ）→
          </button>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        {/* サブタブ */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShiftSubTab('calendar')}
            className={`py-2 rounded-lg font-semibold text-sm transition ${shiftSubTab === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            カレンダー
          </button>
          <button onClick={() => setShiftSubTab('input')}
            className={`py-2 rounded-lg font-semibold text-sm transition ${shiftSubTab === 'input' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            シフト入力
          </button>
        </div>
        {shiftSubTab === 'calendar' ? <CalendarView /> : <InputView />}
      </div>
    );
  };

  // =====================================================
  // ToDoタブ
  // =====================================================
  const TodoTab = () => {
    const [newTodo, setNewTodo] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });

    const addTodo = async () => {
      if (!newTodo.title || !newTodo.dueDate) return;
      const { data, error } = await supabase.from('todos').insert({
        user_id: user.id, title: newTodo.title, description: newTodo.description,
        due_date: newTodo.dueDate, priority: newTodo.priority,
        completed: false, from_study_note: false,
      }).select().single();
      if (!error && data) {
        setTodos(prev => [...prev, todoToState(data)].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
        setNewTodo({ title: '', description: '', dueDate: '', priority: 'medium' });
      }
    };

    const toggleComplete = async (id) => {
      const todo = todos.find(t => t.id === id);
      if (!todo.completed) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }
      await supabase.from('todos').update({ completed: !todo.completed }).eq('id', id);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTodo = async (id) => {
      await supabase.from('todos').delete().eq('id', id);
      setTodos(prev => prev.filter(t => t.id !== id));
    };

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    return (
      <div className="space-y-4">
        {showCelebration && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 pointer-events-none">
            <div className="text-8xl animate-bounce">💮</div>
          </div>
        )}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">新しいToDo</h3>
          <input type="text" value={newTodo.title} onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
            placeholder="タイトル" className="w-full p-2 border rounded mb-2" />
          <textarea value={newTodo.description} onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
            placeholder="詳細（任意）" className="w-full p-2 border rounded h-20 mb-1" />
          <p className="text-xs text-red-400 mb-2">⚠️ 患者氏名・IDなどの個人情報は入力しないでください</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="date" value={newTodo.dueDate} onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })} className="p-2 border rounded" />
            <select value={newTodo.priority} onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })} className="p-2 border rounded">
              <option value="low">優先度: 低</option>
              <option value="medium">優先度: 中</option>
              <option value="high">優先度: 高</option>
            </select>
          </div>
          <button onClick={addTodo} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
            <Plus size={16} /> 追加
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">未完了のToDo ({activeTodos.length})</h3>
          <div className="space-y-2">
            {activeTodos.map(todo => (
              <div key={todo.id} className={`p-3 rounded border ${todo.priority === 'high' ? 'border-red-300 bg-red-50' : todo.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo.id)} className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">{todo.title}</div>
                    {todo.description && <div className="text-sm text-gray-600 mt-1">{todo.description}</div>}
                    <div className="text-xs text-gray-500 mt-1">期限: {todo.dueDate}</div>
                  </div>
                  <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {activeTodos.length === 0 && <p className="text-gray-500 text-center py-4">未完了のToDoはありません</p>}
          </div>
        </div>
        {completedTodos.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">完了したToDo ({completedTodos.length})</h3>
            <div className="space-y-2">
              {completedTodos.map(todo => (
                <div key={todo.id} className="p-3 rounded border border-green-300 bg-green-50 opacity-60">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo.id)} className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium line-through">{todo.title}</div>
                    </div>
                    <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // 勉強ノートタブ
  // =====================================================
  const StudyTab = () => {
    const [newNote, setNewNote] = useState({ title: '', category: '', middleCategory: '', smallCategory: '', content: '', reviewDate: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editNote, setEditNote] = useState(null);
    const [noteError, setNoteError] = useState('');

    const addNote = async () => {
      if (!newNote.category || !newNote.content) {
        setNoteError('カテゴリと内容は必須です。');
        return;
      }
      setNoteError('');
      const { data, error } = await supabase.from('study_notes').insert({
        user_id: user.id, title: newNote.title, category: newNote.category,
        middle_category: newNote.middleCategory, small_category: newNote.smallCategory,
        content: newNote.content, review_date: newNote.reviewDate || null,
      }).select().single();
      if (!error && data) {
        setStudyNotes(prev => [noteToState(data), ...prev]);
        if (newNote.reviewDate) {
          const { data: todoData } = await supabase.from('todos').insert({
            user_id: user.id,
            title: `${newNote.title}の復習`,
            description: `カテゴリ: ${newNote.category}${newNote.middleCategory ? ` > ${newNote.middleCategory}` : ''}`,
            due_date: newNote.reviewDate, priority: 'medium',
            completed: false, from_study_note: true,
          }).select().single();
          if (todoData) setTodos(prev => [...prev, todoToState(todoData)].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
        }
        setNewNote({ title: '', category: '', middleCategory: '', smallCategory: '', content: '', reviewDate: '' });
      }
    };

    const saveEdit = async () => {
      if (!editNote?.title || !editNote?.category || !editNote?.content) return;
      await supabase.from('study_notes').update({
        title: editNote.title, category: editNote.category,
        middle_category: editNote.middleCategory, small_category: editNote.smallCategory,
        content: editNote.content, review_date: editNote.reviewDate || null,
      }).eq('id', editingId);
      setStudyNotes(prev => prev.map(n => n.id === editingId ? { ...editNote } : n));
      setEditingId(null); setEditNote(null);
    };

    const deleteNote = async (id) => {
      await supabase.from('study_notes').delete().eq('id', id);
      setStudyNotes(prev => prev.filter(n => n.id !== id));
    };

    const filteredNotes = studyNotes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || note.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">新しい勉強ノート</h3>
          <input type="text" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            placeholder="タイトル（任意）" className="w-full p-2 border rounded mb-2" />
          <select value={newNote.category} onChange={(e) => setNewNote({ ...newNote, category: e.target.value, middleCategory: '', smallCategory: '' })}
            className="w-full p-2 border rounded mb-2">
            <option value="">大カテゴリを選択</option>
            {studyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {newNote.category === '疾患' && (
            <>
              <select value={newNote.middleCategory} onChange={(e) => setNewNote({ ...newNote, middleCategory: e.target.value, smallCategory: '' })}
                className="w-full p-2 border rounded mb-2">
                <option value="">中カテゴリ（診療科）を選択</option>
                {diseaseMiddleCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {newNote.middleCategory && (
                <select value={newNote.smallCategory} onChange={(e) => setNewNote({ ...newNote, smallCategory: e.target.value })}
                  className="w-full p-2 border rounded mb-2">
                  <option value="">小カテゴリを選択</option>
                  {getSmallCategories(newNote.middleCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              )}
            </>
          )}
          <textarea value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            placeholder="学んだ内容を記録..." className="w-full p-2 border rounded h-32 mb-1" />
          <p className="text-xs text-red-400 mb-2">⚠️ 患者氏名・IDなどの個人情報は入力しないでください</p>
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">復習リマインダー（任意）</label>
            <input type="date" value={newNote.reviewDate} onChange={(e) => setNewNote({ ...newNote, reviewDate: e.target.value })}
              className="w-full p-2 border rounded" />
            <p className="text-xs text-gray-500 mt-1">設定するとToDoに自動追加されます</p>
          </div>
          {noteError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded mb-2">{noteError}</p>}
          <button onClick={addNote} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2">
            <Plus size={16} /> 保存
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ノートを検索..." className="w-full pl-10 p-2 border rounded" />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full p-2 border rounded">
              <option value="">すべてのカテゴリ</option>
              {studyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {filteredNotes.map(note => (
              <div key={note.id} className="border rounded-lg p-4 hover:bg-gray-50">
                {editingId === note.id ? (
                  <div>
                    <input type="text" value={editNote.title} onChange={(e) => setEditNote({ ...editNote, title: e.target.value })} className="w-full p-2 border rounded mb-2" />
                    <select value={editNote.category} onChange={(e) => setEditNote({ ...editNote, category: e.target.value, middleCategory: '', smallCategory: '' })} className="w-full p-2 border rounded mb-2">
                      <option value="">大カテゴリを選択</option>
                      {studyCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <textarea value={editNote.content} onChange={(e) => setEditNote({ ...editNote, content: e.target.value })} className="w-full p-2 border rounded h-32 mb-2" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 flex items-center gap-1"><Save size={14} /> 保存</button>
                      <button onClick={() => { setEditingId(null); setEditNote(null); }} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 flex items-center gap-1"><X size={14} /> キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-blue-600">{note.title}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">{note.category}</span>
                          {note.middleCategory && <span className="text-xs bg-blue-100 px-2 py-1 rounded">{note.middleCategory}</span>}
                          {note.smallCategory && <span className="text-xs bg-green-100 px-2 py-1 rounded">{note.smallCategory}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(note.id); setEditNote({ ...note }); }} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                        <button onClick={() => deleteNote(note.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    {note.reviewDate && <div className="text-xs text-gray-500 mt-2">復習予定: {note.reviewDate}</div>}
                    <div className="text-xs text-gray-400 mt-1">作成日: {new Date(note.createdAt).toLocaleDateString()}</div>
                  </>
                )}
              </div>
            ))}
            {filteredNotes.length === 0 && <p className="text-gray-500 text-center py-4">ノートがありません</p>}
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // 辞典タブ
  // =====================================================
  const DictionaryTab = () => {
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
      await supabase.from('medical_terms').delete().eq('id', id);
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

  // =====================================================
  // 設定タブ
  // =====================================================
  const SettingsTab = () => {
    const [tempSettings, setTempSettings] = useState(userSettings);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [newShift, setNewShift] = useState({ label: '', start: '08:00', end: '17:00', color: 'red' });

    const handlePasswordChange = async () => {
      setPasswordMessage(''); setPasswordError('');
      if (newPassword.length < 6) { setPasswordError('パスワードは6文字以上で入力してください。'); return; }
      if (newPassword !== confirmPassword) { setPasswordError('パスワードが一致しません。'); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPasswordError('パスワードの変更に失敗しました。'); }
      else { setPasswordMessage('パスワードを変更しました。'); setNewPassword(''); setConfirmPassword(''); }
    };

    const handleSave = async () => {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        profession: tempSettings.profession,
        department: tempSettings.department,
        shift_system: tempSettings.shiftSystem,
        shift_times: tempSettings.shiftTimes,
        custom_shifts: tempSettings.customShifts || [],
      }, { onConflict: 'user_id' });
      setUserSettings(tempSettings);
      alert('設定を保存しました！');
    };

    const getAvailableShiftTypes = () => {
      if (tempSettings.shiftSystem === 'day') return ['day', 'am', 'pm', 'late', 'early'];
      if (tempSettings.shiftSystem === '3') return ['day', 'evening', 'lateNight', 'am', 'pm', 'late', 'early'];
      return ['day', 'night', 'am', 'pm', 'late', 'early'];
    };
    const DEFAULT_LABELS = { day:'日勤', night:'夜勤', evening:'準夜勤', lateNight:'深夜勤', am:'AM', pm:'PM', late:'遅出', early:'早出' };

    const updateShiftTime = (shiftId, field, value) => {
      const cur = tempSettings.shiftTimes[shiftId] || { start: '00:00', end: '00:00' };
      setTempSettings({ ...tempSettings, shiftTimes: { ...tempSettings.shiftTimes, [shiftId]: { ...cur, [field]: value } } });
    };

    const addCustomShift = () => {
      if (!newShift.label.trim()) return;
      const id = `custom_${Date.now()}`;
      setTempSettings(prev => ({ ...prev, customShifts: [...(prev.customShifts || []), { id, ...newShift }] }));
      setNewShift({ label: '', start: '08:00', end: '17:00', color: 'rose' });
    };

    const updateCustomShift = (idx, field, value) => {
      setTempSettings(prev => {
        const updated = [...(prev.customShifts || [])];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, customShifts: updated };
      });
    };

    const deleteCustomShift = (idx) => {
      setTempSettings(prev => ({ ...prev, customShifts: (prev.customShifts || []).filter((_, i) => i !== idx) }));
    };

    const ColorPicker = ({ selected, onChange }) => (
      <div className="flex gap-2 flex-wrap mt-2">
        {SHIFT_COLORS.map(c => (
          <button key={c.key} onClick={() => onChange(c.key)}
            style={{ backgroundColor: c.bg }}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${selected === c.key ? 'border-gray-700 scale-125' : 'border-transparent'}`} />
        ))}
      </div>
    );

    return (
      <div className="space-y-4">
        {/* ユーザー属性 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 text-lg">ユーザー属性</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">職種</label>
            <select value={tempSettings.profession} onChange={(e) => setTempSettings({ ...tempSettings, profession: e.target.value })} className="w-full p-2 border rounded">
              <option value="">選択してください</option>
              {professions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">所属病棟</label>
            <select value={tempSettings.department} onChange={(e) => setTempSettings({ ...tempSettings, department: e.target.value })} className="w-full p-2 border rounded">
              <option value="">選択してください</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">勤務体制</label>
            <select value={tempSettings.shiftSystem} onChange={(e) => setTempSettings({ ...tempSettings, shiftSystem: e.target.value })} className="w-full p-2 border rounded">
              <option value="day">日勤のみ</option>
              <option value="2">2交代制（日勤・夜勤）</option>
              <option value="3">3交代制（日勤・準夜勤・深夜勤）</option>
            </select>
          </div>
        </div>

        {/* 既存シフト時間・名前設定 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-1 text-lg">シフト種別の設定</h3>
          <p className="text-xs text-gray-400 mb-4">勤務名・開始・終了時刻を変更できます</p>
          {getAvailableShiftTypes().map(shiftId => {
            const shiftTime = tempSettings.shiftTimes[shiftId] || { start: '00:00', end: '00:00' };
            return (
              <div key={shiftId} className="mb-4 p-3 bg-gray-50 rounded-lg">
                <input type="text"
                  value={shiftTime.label ?? DEFAULT_LABELS[shiftId]}
                  onChange={(e) => updateShiftTime(shiftId, 'label', e.target.value)}
                  className="w-full p-2 border rounded mb-2 font-medium text-sm"
                  placeholder={DEFAULT_LABELS[shiftId]} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={shiftTime.start} onChange={(e) => updateShiftTime(shiftId, 'start', e.target.value)} className="p-2 border rounded text-sm" />
                  <input type="time" value={shiftTime.end} onChange={(e) => updateShiftTime(shiftId, 'end', e.target.value)} className="p-2 border rounded text-sm" />
                </div>
              </div>
            );
          })}
        </div>

        {/* カスタムシフト種別 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-1 text-lg">カスタムシフト種別</h3>
          <p className="text-xs text-gray-400 mb-4">自由に追加・削除できます</p>

          {(tempSettings.customShifts || []).map((cs, idx) => (
            <div key={cs.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2 mb-2">
                <input type="text" value={cs.label}
                  onChange={(e) => updateCustomShift(idx, 'label', e.target.value)}
                  placeholder="勤務名" className="flex-1 p-2 border rounded text-sm font-medium" />
                <button onClick={() => deleteCustomShift(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-1">
                <input type="time" value={cs.start} onChange={(e) => updateCustomShift(idx, 'start', e.target.value)} className="p-2 border rounded text-sm" />
                <input type="time" value={cs.end} onChange={(e) => updateCustomShift(idx, 'end', e.target.value)} className="p-2 border rounded text-sm" />
              </div>
              <ColorPicker selected={cs.color} onChange={(c) => updateCustomShift(idx, 'color', c)} />
            </div>
          ))}

          <div className="p-3 border-2 border-dashed border-indigo-200 rounded-lg">
            <p className="text-sm font-semibold text-indigo-700 mb-2">＋ 新しいシフト種別を追加</p>
            <input type="text" value={newShift.label} onChange={(e) => setNewShift({ ...newShift, label: e.target.value })}
              placeholder="勤務名（例：日長、夜勤A）" className="w-full p-2 border rounded mb-2 text-sm" />
            <div className="grid grid-cols-2 gap-2 mb-1">
              <input type="time" value={newShift.start} onChange={(e) => setNewShift({ ...newShift, start: e.target.value })} className="p-2 border rounded text-sm" />
              <input type="time" value={newShift.end} onChange={(e) => setNewShift({ ...newShift, end: e.target.value })} className="p-2 border rounded text-sm" />
            </div>
            <ColorPicker selected={newShift.color} onChange={(c) => setNewShift({ ...newShift, color: c })} />
            <button onClick={addCustomShift}
              className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 flex items-center justify-center gap-1">
              <Plus size={16} /> 追加する
            </button>
          </div>
        </div>

        <button onClick={handleSave} className="w-full bg-blue-500 text-white px-4 py-3 rounded hover:bg-blue-600 flex items-center justify-center gap-2 font-semibold">
          <Save size={20} /> 設定を保存
        </button>

        {/* パスワード変更 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 text-lg">パスワード変更</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">新しいパスワード（6文字以上）</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full p-2 border rounded" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">新しいパスワード（確認）</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full p-2 border rounded" />
          </div>
          {passwordError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded mb-2">{passwordError}</p>}
          {passwordMessage && <p className="text-green-600 text-sm bg-green-50 p-2 rounded mb-2">{passwordMessage}</p>}
          <button onClick={handlePasswordChange} className="w-full bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 font-semibold">
            パスワードを変更する
          </button>
        </div>
      </div>
    );
  };

  // =====================================================
  // 最新情報タブ（準備中）
  // =====================================================
  const NewsTab = () => {
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Newspaper size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-semibold text-lg text-gray-600 mb-2">最新情報機能は準備中です</h3>
          <p className="text-sm text-gray-500">近日公開予定です。しばらくお待ちください。</p>
        </div>
      </div>
    );
  };

  // =====================================================
  // メイン画面レンダリング
  // =====================================================
  const dismissWarning = () => {
    localStorage.setItem(`privacy-warned-${user.id}`, 'true');
    setShowWarning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">

      {/* 初回警告ポップアップ */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-3xl mb-3 text-center">⚠️</div>
            <h2 className="font-bold text-lg text-center text-gray-900 mb-3">ご利用前にお読みください</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              本アプリには<span className="font-semibold text-red-600">患者氏名・ID・診断名などの個人情報を入力しないでください。</span>
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              日記・ToDo・勉強ノートへの記録は個人の学習・業務管理を目的としています。医療現場の個人情報保護に関するルールを遵守してご利用ください。
            </p>
            <button onClick={dismissWarning}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
              理解しました
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-900">看護師サポートアプリ</h1>
          <div className="flex items-center gap-3">
            <button onClick={onShowPrivacy} className="text-xs text-gray-400 hover:underline">
              プライバシーポリシー
            </button>
            <button onClick={onSignOut} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <LogOut size={16} /> ログアウト
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { id: 'diary',      label: '日記',   icon: <BookOpen size={18} /> },
            { id: 'shift',      label: 'シフト', icon: <Clock size={18} /> },
            { id: 'todo',       label: 'ToDo',   icon: <CheckSquare size={18} /> },
            { id: 'study',      label: '勉強',   icon: <Book size={18} /> },
            { id: 'dictionary', label: '辞典',   icon: <Calendar size={18} /> },
            { id: 'news',       label: '情報',   icon: <Newspaper size={18} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`py-3 rounded-lg font-semibold flex items-center justify-center gap-1 transition text-sm ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
          <button onClick={() => setActiveTab('settings')}
            className={`py-3 rounded-lg font-semibold flex items-center justify-center gap-1 transition text-sm col-span-3 ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Settings size={18} /> 設定
          </button>
        </div>

        <div>
          {activeTab === 'diary'      && <DiaryTab />}
          {activeTab === 'shift'      && <ShiftTab />}
          {activeTab === 'todo'       && <TodoTab />}
          {activeTab === 'study'      && <StudyTab />}
          {activeTab === 'dictionary' && <DictionaryTab />}
          {activeTab === 'news'       && <NewsTab />}
          {activeTab === 'settings'   && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default NurseApp;
