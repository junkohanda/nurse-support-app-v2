const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <button onClick={onBack} className="text-sm text-indigo-600 hover:underline mb-6 block">
            ← 戻る
          </button>

          <h1 className="text-xl font-bold text-indigo-900 mb-6">プライバシーポリシー</h1>

          <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

            <section>
              <p>看護師サポートアプリ（以下「本アプリ」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">1. 収集する情報</h2>
              <p>本アプリでは、以下の情報を収集します。</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>メールアドレス（アカウント登録・ログインに使用）</li>
                <li>アプリ内に入力したデータ（シフト・日記・ToDo・勉強ノート・用語辞典・気分ログなど）</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">2. 利用目的</h2>
              <p>収集した情報は、以下の目的のみに使用します。</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>アカウントの認証・管理</li>
                <li>アプリ内データの保存・表示</li>
                <li>サービスの改善・機能追加の参考</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">3. 第三者への提供</h2>
              <p>法令に基づく場合を除き、ユーザーの個人情報を第三者に提供・販売することはありません。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">4. データの管理・保管</h2>
              <p>データはSupabase（米国）のサーバーに暗号化して保存されます。ユーザー自身のデータは本人のみがアクセスできる設計になっており、運営者もデータの内容を閲覧することはありません。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">5. データの削除</h2>
              <p>アカウントおよびデータの削除を希望する場合は、下記お問い合わせ先までご連絡ください。速やかに対応いたします。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">6. Cookieの使用</h2>
              <p>本アプリはログイン状態を維持するためにCookieおよびローカルストレージを使用します。ブラウザの設定により無効にすることも可能ですが、一部機能が利用できなくなる場合があります。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">7. プライバシーポリシーの変更</h2>
              <p>本ポリシーは必要に応じて変更することがあります。変更の際はアプリ内でお知らせします。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">8. お問い合わせ</h2>
              <p>個人情報の取り扱いに関するご質問・削除依頼は以下までご連絡ください。</p>
              <p className="mt-2">メール：junko.kimura.316@gmail.com</p>
            </section>

            <section className="text-xs text-gray-400 pt-4 border-t">
              <p>制定日：2026年4月27日</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
