import React from 'react';
import { Newspaper } from 'lucide-react';

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

export default NewsTab;
