import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NurseAppContext = createContext(null);

export const useNurseApp = () => useContext(NurseAppContext);

// =====================================================
// 定数・ヘルパー（タブ間で共有）
// =====================================================
export const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const SHIFT_COLORS = [
  { key: 'red',     bg: '#fecaca', cls: 'bg-red-100 text-red-800 border-red-300' },
  { key: 'lime',    bg: '#d9f99d', cls: 'bg-lime-100 text-lime-800 border-lime-300' },
  { key: 'sky',     bg: '#e0f2fe', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
  { key: 'hotpink', bg: '#f0abfc', cls: 'bg-fuchsia-300 text-fuchsia-900 border-fuchsia-400' },
  { key: 'cream',   bg: '#fde68a', cls: 'bg-amber-200 text-amber-900 border-amber-400' },
  { key: 'peach',   bg: '#fed7aa', cls: 'bg-orange-200 text-orange-800 border-orange-300' },
  { key: 'blue',    bg: '#93c5fd', cls: 'bg-blue-300 text-blue-900 border-blue-400' },
  { key: 'gray',    bg: '#d1d5db', cls: 'bg-gray-300 text-gray-700 border-gray-400' },
];

export const defaultDiaryTemplates = [
  '疲れた', '充実した一日だった', '大変だったけど学びが多かった',
  'インシデントがあった', '患者さんに感謝された',
  '夜勤明けで眠い', 'チームワークが良かった', '忙しすぎた',
];

export const studyCategories = ['疾患', '看護技術', '薬剤知識', '検査', '医療機器', '処置', 'その他'];

export const diseaseMiddleCategories = [
  '脳外科', '神経内科', '脳血管内治療科', '小児科', 'NICU',
  '消化器内科', '消化器外科', '循環器内科', '循環器外科',
  '整形外科', '産婦人科', 'ICU', '腎臓内科', '内分泌科',
  '呼吸器内科', '呼吸器外科', '血液内科', '精神科', '形成外科',
  'アレルギー膠原病科', '泌尿器科', '眼科', '皮膚科', '耳鼻咽喉科',
  '放射線科', '救急外来', '手術室', '透析室', '内視鏡', 'その他外来',
];

export const getSmallCategories = (middle) => {
  if (middle === '産婦人科') return ['急性疾患','慢性疾患','悪性腫瘍','感染症','正常分娩','異常分娩','流産','不妊症','その他'];
  if (middle === '手術室')   return ['外回り','器械出し','麻酔管理・全身管理','術前術後訪問','その他'];
  if (middle === '透析室')   return ['透析原理・機器','ブラッドアクセス','観察・トラブル対応','検査値と食事・生活指導','その他'];
  if (middle === '放射線科') return ['検査','処置','放射線治療','その他'];
  if (middle === '内視鏡')   return ['検査','治療','その他'];
  if (middle === '救急外来') return ['急性疾患','外傷','小児','その他'];
  return ['急性疾患','慢性疾患','悪性腫瘍','自己免疫疾患','感染症','その他'];
};

export const professions = ['看護師', '助産師', '准看護師', 'その他'];

export const departments = [
  '脳外科', '神経内科', '脳血管内治療科', '小児科', 'NICU',
  '消化器内科', '消化器外科', '循環器内科', '循環器外科',
  '整形外科', '産婦人科', 'ICU', '腎臓内科', '内分泌科',
  '呼吸器内科', '呼吸器外科', '血液内科', '精神科', '形成外科',
  'アレルギー膠原病科', '泌尿器科', '眼科', '皮膚科', '耳鼻咽喉科',
  '放射線科', '救急外来', '手術室', '透析室', '内視鏡室', 'その他外来', 'その他',
];

// =====================================================
// Provider
// =====================================================
export const NurseAppProvider = ({ user, children }) => {
  const [activeTab, setActiveTab] = useState('diary');
  const [diaries, setDiaries] = useState([]);
  const [shifts, setShifts] = useState({});
  const [terms, setTerms] = useState([]);
  const [todos, setTodos] = useState([]);
  const [studyNotes, setStudyNotes] = useState([]);
  const [diaryTemplates, setDiaryTemplates] = useState([]);
  const [hiddenDefaultTemplates, setHiddenDefaultTemplates] = useState([]);
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
  const [todayMood, setTodayMood] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [shiftSubTab, setShiftSubTab] = useState('input');
  const [seqDate, setSeqDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [calendarEvents, setCalendarEvents] = useState({});
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const shiftSeqDate = (dateStr, delta) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + delta);
    return toLocalDateStr(d);
  };

  // 変換ヘルパー
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

  // シフト定義
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

  // カレンダーイベント操作
  const saveCalendarEvent = async (stamp, title, memo) => {
    const date = calendarSelectedDate;
    if (editingEvent) {
      const { error } = await supabase.from('calendar_events').update({ stamp, title, memo }).eq('id', editingEvent.id);
      if (error) { showError('イベントの更新に失敗しました'); return; }
      setCalendarEvents(prev => ({
        ...prev,
        [date]: (prev[date] || []).map(e => e.id === editingEvent.id ? { ...e, stamp, title, memo } : e),
      }));
    } else {
      const { data, error } = await supabase.from('calendar_events').insert({
        user_id: user.id, date, stamp, title, memo,
      }).select().single();
      if (error) { showError('イベントの保存に失敗しました'); return; }
      if (data) {
        setCalendarEvents(prev => ({
          ...prev,
          [date]: [...(prev[date] || []), { id: data.id, title, memo, stamp }],
        }));
      }
    }
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const deleteCalendarEvent = async () => {
    if (!editingEvent) return;
    const date = calendarSelectedDate;
    const { error } = await supabase.from('calendar_events').delete().eq('id', editingEvent.id);
    if (error) { showError('イベントの削除に失敗しました'); return; }
    setCalendarEvents(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(e => e.id !== editingEvent.id),
    }));
    setShowEventModal(false);
    setEditingEvent(null);
  };

  // データ読み込み
  const initialTerms = [
    { term: 'BP',   full_name: 'Blood Pressure',                               meaning: '血圧' },
    { term: 'HR',   full_name: 'Heart Rate',                                   meaning: '心拍数' },
    { term: 'RR',   full_name: 'Respiratory Rate',                             meaning: '呼吸数' },
    { term: 'SpO2', full_name: 'Saturation of Percutaneous Oxygen',            meaning: '経皮的動脈血酸素飽和度' },
    { term: 'BT',   full_name: 'Body Temperature',                             meaning: '体温' },
    { term: 'ICU',  full_name: 'Intensive Care Unit',                          meaning: '集中治療室' },
    { term: 'ER',   full_name: 'Emergency Room',                               meaning: '救急室' },
    { term: 'NPO',  full_name: 'Nil Per Os',                                   meaning: '絶食' },
    { term: 'IV',   full_name: 'Intravenous',                                  meaning: '静脈内投与' },
    { term: 'IM',   full_name: 'Intramuscular',                                meaning: '筋肉内注射' },
    { term: 'VS',   full_name: 'Vital Signs',                                  meaning: 'バイタルサイン' },
    { term: 'ADL',  full_name: 'Activities of Daily Living',                   meaning: '日常生活動作' },
    { term: 'GCS',  full_name: 'Glasgow Coma Scale',                           meaning: 'グラスゴー昏睡スケール' },
    { term: 'BS',   full_name: 'Blood Sugar',                                  meaning: '血糖値' },
    { term: 'Hb',   full_name: 'Hemoglobin',                                   meaning: 'ヘモグロビン' },
    { term: 'WBC',  full_name: 'White Blood Cell',                             meaning: '白血球数' },
    { term: 'Plt',  full_name: 'Platelet',                                     meaning: '血小板' },
    { term: 'CRP',  full_name: 'C-Reactive Protein',                           meaning: 'C反応性タンパク（炎症の指標）' },
    { term: 'BUN',  full_name: 'Blood Urea Nitrogen',                          meaning: '血中尿素窒素（腎機能の指標）' },
    { term: 'Cr',   full_name: 'Creatinine',                                   meaning: 'クレアチニン（腎機能の指標）' },
    { term: 'Na',   full_name: 'Sodium',                                       meaning: 'ナトリウム（電解質）' },
    { term: 'K',    full_name: 'Potassium',                                    meaning: 'カリウム（電解質）' },
    { term: 'O2',   full_name: 'Oxygen',                                       meaning: '酸素' },
    { term: 'DNR',  full_name: 'Do Not Resuscitate',                           meaning: '蘇生拒否指示' },
    { term: 'prn',  full_name: 'Pro Re Nata',                                  meaning: '必要時投与' },
    { term: 'STAT', full_name: 'Statim',                                       meaning: '至急・即時' },
    { term: 'PO',   full_name: 'Per Os',                                       meaning: '経口投与' },
    { term: 'SC',   full_name: 'Subcutaneous',                                 meaning: '皮下注射' },
    { term: 'MRSA', full_name: 'Methicillin-resistant Staphylococcus aureus',  meaning: 'メチシリン耐性黄色ブドウ球菌' },
    { term: 'HCU',  full_name: 'High Care Unit',                               meaning: '高度治療室' },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const uid = user.id;
    const today = toLocalDateStr(new Date());
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const thirtyDaysAgoStr = toLocalDateStr(thirtyDaysAgo);
    const [diariesRes, shiftsRes, termsRes, settingsRes, todosRes, studyRes, templatesRes, hiddenRes, moodRes, eventsRes, moodHistoryRes] = await Promise.all([
      supabase.from('diaries').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('shifts').select('*').eq('user_id', uid),
      supabase.from('medical_terms').select('*').eq('user_id', uid).order('term'),
      supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('todos').select('*').eq('user_id', uid).order('due_date'),
      supabase.from('study_notes').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('diary_templates').select('*').eq('user_id', uid),
      supabase.from('hidden_templates').select('*').eq('user_id', uid),
      supabase.from('mood_logs').select('*').eq('user_id', uid).eq('date', today).maybeSingle(),
      supabase.from('calendar_events').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('mood_logs').select('date,mood').eq('user_id', uid).gte('date', thirtyDaysAgoStr).order('date'),
    ]);

    setDiaries(diariesRes.data || []);

    const shiftsObj = {};
    (shiftsRes.data || []).forEach(s => { shiftsObj[s.date] = s.shift_type; });
    setShifts(shiftsObj);

    if ((termsRes.data || []).length === 0) {
      const toInsert = initialTerms.map(t => ({ ...t, user_id: uid }));
      await supabase.from('medical_terms').upsert(toInsert, { onConflict: 'user_id,term', ignoreDuplicates: true });
      const { data: inserted } = await supabase.from('medical_terms').select('*').eq('user_id', uid).order('term');
      setTerms((inserted || []).map(termToState));
    } else {
      setTerms((termsRes.data || []).map(termToState));
    }

    if (settingsRes.data) {
      setUserSettings(settingsToState(settingsRes.data));
    } else {
      const defaultSettings = {
        user_id: uid, profession: '', department: '', shift_system: '2',
        shift_times: userSettings.shiftTimes,
      };
      await supabase.from('user_settings').insert(defaultSettings);
    }

    setTodos((todosRes.data || []).map(todoToState));
    setStudyNotes((studyRes.data || []).map(noteToState));
    setDiaryTemplates((templatesRes.data || []).map(t => ({ id: t.id, content: t.content })));
    setHiddenDefaultTemplates((hiddenRes.data || []).map(t => t.content));
    if (moodRes.data) setTodayMood(moodRes.data.mood);
    setMoodHistory(moodHistoryRes.data || []);

    const eventsMap = {};
    (eventsRes.data || []).forEach(e => {
      if (!eventsMap[e.date]) eventsMap[e.date] = [];
      eventsMap[e.date].push({ id: e.id, title: e.title, memo: e.memo, stamp: e.stamp });
    });
    setCalendarEvents(eventsMap);

    const warned = localStorage.getItem(`privacy-warned-${uid}`);
    if (!warned) setShowWarning(true);
  };

  const value = {
    user,
    activeTab, setActiveTab,
    diaries, setDiaries,
    shifts, setShifts,
    terms, setTerms,
    todos, setTodos,
    studyNotes, setStudyNotes,
    diaryTemplates, setDiaryTemplates,
    hiddenDefaultTemplates, setHiddenDefaultTemplates,
    searchTerm, setSearchTerm,
    currentMonth, setCurrentMonth,
    selectedDate, setSelectedDate,
    showCelebration, setShowCelebration,
    userSettings, setUserSettings,
    todayMood, setTodayMood,
    showWarning, setShowWarning,
    shiftSubTab, setShiftSubTab,
    seqDate, setSeqDate,
    calendarEvents, setCalendarEvents,
    calendarSelectedDate, setCalendarSelectedDate,
    showEventModal, setShowEventModal,
    editingEvent, setEditingEvent,
    showCopyConfirm, setShowCopyConfirm,
    moodHistory, setMoodHistory,
    errorMessage,
    showError,
    shiftSeqDate,
    shiftTypes,
    termToState,
    todoToState,
    noteToState,
    saveCalendarEvent,
    deleteCalendarEvent,
  };

  return (
    <NurseAppContext.Provider value={value}>
      {children}
    </NurseAppContext.Provider>
  );
};
