const Privacy = () => (
  <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900 sm:p-10">
      <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
      <p className="mt-2 text-sm text-gray-500">Son güncelleme: 14 Eylül 2026</p>
      <div className="mt-8 space-y-6 leading-7">
        <section><h2 className="text-xl font-semibold">1. Derkenar hakkında</h2><p className="mt-2">Derkenar; hukuk bürolarının müvekkil, dava, danışmanlık, görev, toplantı, takvim ve ilgili ofis süreçlerini yönetmesine yardımcı olan bir hukuk bürosu yönetim uygulamasıdır.</p></section>
        <section><h2 className="text-xl font-semibold">2. İşlenen bilgiler</h2><p className="mt-2">Hizmetin sunulması için hesap bilgileri, kullanıcı tarafından uygulamaya girilen ofis kayıtları ve etkinleştirilen entegrasyonların çalışması için gerekli teknik bilgiler işlenebilir.</p></section>
        <section><h2 className="text-xl font-semibold">3. Google Calendar entegrasyonu</h2><p className="mt-2">Google Calendar bağlantısı isteğe bağlıdır. Kullanıcı bağlantıyı başlattığında Google'ın yetkilendirme ekranına yönlendirilir ve yalnızca açıkça izin verdiği kapsamlar için erişim sağlanır. Bu erişim, Derkenar'daki takvimle ilişkili kayıtların kullanıcının kendi Google Takvimi ile senkronize edilmesi amacıyla kullanılır.</p><p className="mt-2">Google hesabı parolası Derkenar tarafından alınmaz veya saklanmaz. Yetkilendirme bilgileri entegrasyonu sürdürebilmek amacıyla güvenli şekilde saklanır.</p></section>
        <section><h2 className="text-xl font-semibold">4. Verilerin kullanımı</h2><p className="mt-2">Bilgiler; uygulama özelliklerini sağlamak, kullanıcı tarafından talep edilen senkronizasyonları gerçekleştirmek, güvenliği sağlamak ve hizmetin çalışmasını sürdürmek amacıyla kullanılır.</p></section>
        <section><h2 className="text-xl font-semibold">5. Veri güvenliği</h2><p className="mt-2">Hesap ve entegrasyon bilgilerinin yetkisiz erişime karşı korunması için makul teknik ve idari güvenlik önlemleri uygulanır.</p></section>
        <section><h2 className="text-xl font-semibold">6. Kullanıcı tercihleri</h2><p className="mt-2">Google Calendar entegrasyonu zorunlu değildir. Kullanıcı Derkenar içindeki bağlantıyı kaldırabilir ve Google hesabındaki üçüncü taraf erişim ayarlarından verdiği izni ayrıca iptal edebilir.</p></section>
        <section><h2 className="text-xl font-semibold">7. İletişim</h2><p className="mt-2">Gizlilik ve entegrasyonlarla ilgili sorular için OAuth onay ekranında belirtilen kullanıcı destek e-posta adresi üzerinden iletişime geçebilirsiniz.</p></section>
      </div>
    </article>
  </main>
);
export default Privacy;
