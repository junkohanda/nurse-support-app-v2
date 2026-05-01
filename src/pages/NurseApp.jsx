import React, { useState } from 'react';
import {
  Calendar, BookOpen, Clock, X,
  ChevronLeft, ChevronRight, Settings, Newspaper, CheckSquare, Book, LogOut, Plus, Edit2
} from 'lucide-react';
import { NurseAppProvider, useNurseApp } from '../context/NurseAppContext';
import DiaryTab from '../components/tabs/DiaryTab';
import ShiftTab from '../components/tabs/ShiftTab';
import TodoTab from '../components/tabs/TodoTab';
import StudyTab from '../components/tabs/StudyTab';
import DictionaryTab from '../components/tabs/DictionaryTab';
import SettingsTab from '../components/tabs/SettingsTab';
import NewsTab from '../components/tabs/NewsTab';

// =====================================================
// カレンダーイベントモーダル
// =====================================================
const STAMPS = [
  '📝','🕰️','💊','💉','🏥','📋',
  '🩷','💜','🩵','🧡','🌈','🦋',
  '🌸','🌺','🌷','🐣','🐻','🧸',
  '🎀','🍓','🍽️','🍰','☕','💫',
  '✨','🌟','🎵','🎉','🫶','🪄',
];

const EventModal = ({ date, editingEvent, onSave, onDelete, onClose }) => {
  const [stamp, setStamp] = useState(editingEvent?.stamp || null);
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [memo, setMemo] = useState(editingEvent?.memo || '');

  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-gray-900">{dateLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <p className="text-xs font-semibold text-gray-500 mb-2">スタンプ</p>
        <div className="grid grid-cols-8 gap-1 mb-4">
          {STAMPS.map(s => (
            <button key={s} onClick={() => setStamp(stamp === s ? null : s)}
              className={`text-xl p-1.5 rounded-lg transition ${stamp === s ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-gray-100'}`}>
              {s}
            </button>
          ))}
        </div>

        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル（任意）"
          className="w-full p-2 border border-gray-200 rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ（任意）"
          className="w-full p-2 border border-gray-200 rounded-lg h-20 mb-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />

        <div className="flex gap-2">
          {editingEvent && (
            <button onClick={onDelete}
              className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition">
              削除
            </button>
          )}
          <button onClick={() => onSave(stamp, title, memo)}
            disabled={!stamp && !title && !memo}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed">
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// メインコンテンツ
// =====================================================
const NurseAppContent = ({ onSignOut, onShowPrivacy }) => {
  const {
    activeTab, setActiveTab,
    showWarning, setShowWarning,
    showEventModal, setShowEventModal,
    editingEvent, setEditingEvent,
    calendarSelectedDate,
    saveCalendarEvent, deleteCalendarEvent,
    errorMessage,
    user,
  } = useNurseApp();

  const dismissWarning = () => {
    localStorage.setItem(`privacy-warned-${user.id}`, 'true');
    setShowWarning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">

      {/* エラー通知バー */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-semibold">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* カレンダーイベントモーダル */}
      {showEventModal && calendarSelectedDate && (
        <EventModal
          key={editingEvent?.id || 'new'}
          date={calendarSelectedDate}
          editingEvent={editingEvent}
          onSave={saveCalendarEvent}
          onDelete={deleteCalendarEvent}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
        />
      )}

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

// =====================================================
// エントリーポイント
// =====================================================
const NurseApp = ({ user, onSignOut, onShowPrivacy }) => {
  return (
    <NurseAppProvider user={user}>
      <NurseAppContent onSignOut={onSignOut} onShowPrivacy={onShowPrivacy} />
    </NurseAppProvider>
  );
};

export default NurseApp;
