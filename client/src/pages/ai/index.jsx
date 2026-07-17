import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import aiApi from '../../features/ai/ai.api.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import toast from 'react-hot-toast';

const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState('analyze');
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [draftType, setDraftType] = useState('petition');
  const [draftData, setDraftData] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef();

  const analyzeDocument = useMutation({
    mutationFn: (data) => aiApi.analyzeDocument(data),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success('Belge analiz edildi');
      setIsAnalyzing(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Analiz başarısız');
      setIsAnalyzing(false);
    },
  });

  const getLegalAdvice = useMutation({
    mutationFn: (data) => aiApi.getLegalAdvice(data),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success('Hukuki danışmanlık oluşturuldu');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Danışmanlık oluşturulamadı');
    },
  });

  const generateDraft = useMutation({
    mutationFn: (data) => aiApi.generateDraft(data),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success('Belge Oluşturuldu');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Belge Oluşturulamadı');
    },
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('Dosya boyutu 5MB\'dan büyük olamaz');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAnalyze = () => {
    if (!file) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);
    analyzeDocument.mutate(formData);
  };

  const handleAdvice = () => {
    if (!query) {
      toast.error('Lütfen bir soru girin');
      return;
    }
    getLegalAdvice.mutate({ query, context });
  };

  const handleDraft = () => {
    if (!draftData) {
      toast.error('Lütfen bilgileri girin');
      return;
    }
    try {
      const data = JSON.parse(draftData);
      generateDraft.mutate({ type: draftType, data });
    } catch (error) {
      toast.error('Lütfen geçerli bir JSON formatı girin');
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <Card>
        <Card.Header>
          <h2 className="font-semibold text-gray-900 dark:text-white">📊 Sonuç</h2>
        </Card.Header>
        <Card.Body>
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        🤖 Yapay Zeka Asistanı
      </h1>
      <Badge variant="warning">
    Demo Sürümü • AI Özellikleri Devre Dışı
  </Badge>
  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
  <strong>ℹ️ Bilgilendirme:</strong> Bu demo sürümünde yapay zeka özellikleri
  tanıtım amacıyla gösterilmektedir. Belge analizi, hukuki danışmanlık ve belge
  oluşturma işlemleri aktif değildir.
</div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'analyze', label: '📄 Belge Analizi' },
          { id: 'advice', label: '💡 Hukuki Danışmanlık' },
          { id: 'draft', label: '📝 Belge Oluştur' },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab(tab.id);
              setResult(null);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Document Analysis */}
      {activeTab === 'analyze' && (
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              📄 Belge Analizi
            </h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div>
                  <div className="text-4xl mb-2">📎</div>
                  <p className="text-gray-900 dark:text-white font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-sm text-blue-600 mt-2">Değiştirmek için tıkla</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📤</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Belge yükle (PDF, Word, TXT)
                  </p>
                  <p className="text-sm text-gray-500 mt-1">max 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              loading={isAnalyzing}
              disabled={!file}
              className="w-full"
            >
              {isAnalyzing ? 'Analiz Ediliyor...' : '🔍 Belgeyi Analiz Et'}
            </Button>

            {renderResult()}
          </Card.Body>
        </Card>
      )}

      {/* Legal Advice */}
      {activeTab === 'advice' && (
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              💡 Hukuki Danışmanlık
            </h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sorunuz *
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows="4"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hukuki sorunuzu yazın..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bağlam (Opsiyonel)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows="3"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ek bilgiler..."
              />
            </div>

            <Button
              onClick={handleAdvice}
              loading={getLegalAdvice.isPending}
              disabled={!query}
              className="w-full"
            >
              {getLegalAdvice.isPending ? 'Oluşturuluyor...' : '💬 Danışmanlık Al'}
            </Button>

            {renderResult()}
          </Card.Body>
        </Card>
      )}

      {/* Draft Generation */}
      {activeTab === 'draft' && (
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              📝 Belge Oluştur
            </h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Belge Türü
              </label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="petition">Dilekçe</option>
                <option value="contract">Sözleşme</option>
                <option value="notice">İhtarname</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bilgiler (JSON formatında) *
              </label>
              <textarea
                value={draftData}
                onChange={(e) => setDraftData(e.target.value)}
                rows="6"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder={`{
  "court": "İstanbul 2. Asliye Hukuk Mahkemesi",
  "plaintiff": "Ahmet Yılmaz",
  "defendant": "ABC Şirketi",
  "subject": "İş Davası"
}`}
              />
            </div>

            <Button
              onClick={handleDraft}
              loading={generateDraft.isPending}
              disabled={!draftData}
              className="w-full"
            >
              {generateDraft.isPending ? 'Oluşturuluyor...' : '📝 Belge Oluştur'}
            </Button>

            {renderResult()}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default AIAssistant;