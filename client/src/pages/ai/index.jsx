import { useEffect, useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../../app/providers/auth.provider.jsx';

import aiApi from '../../features/ai/ai.api.js';
import documentApi from '../../features/documents/document.api.js';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

const getInitialDraftForm = () => ({
  court: '',
  plaintiff: '',
  defendant: '',
  subject: '',
  facts: '',
  claims: '',
  evidence: '',

  contractTitle: '',
  firstParty: '',
  secondParty: '',
  scope: '',
  paymentTerms: '',
  duration: '',
  specialTerms: '',

  recipient: '',
  sender: '',
  noticeSubject: '',
  description: '',
  requestedAction: '',
  deadline: '',
  consequences: '',
});

const unwrapResponse = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

const getDocumentsFromResponse = (response) => {
  const payload = unwrapResponse(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const splitLines = (value) => {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};
const riskLabels = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

const categoryLabels = {
  general: 'Genel',
  contract: 'Sözleşme',
  petition: 'Dilekçe',
  court_decision: 'Mahkeme Kararı',
  evidence: 'Delil',
  other: 'Diğer',
};

const analysisTypeLabels = {
  document_analysis: 'Belge Analizi',
  legal_research: 'Hukuki Ön Değerlendirme',
  legal_assessment: 'Hukuki Ön Değerlendirme',
  draft_generation: 'Şablon Oluşturma',
  template_generation: 'Şablon Oluşturma',
};

const analysisStatusLabels = {
  completed: 'Tamamlandı',
  pending: 'Bekliyor',
  processing: 'İşleniyor',
  failed: 'Başarısız',
};

const ResultList = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Kayıt bulunamadı.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${index}-${String(item).slice(0, 30)}`}
          className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        >
          {typeof item === 'string'
            ? item
            : JSON.stringify(item)}
        </li>
      ))}
    </ul>
  );
};

const AnalysisResult = ({ analysis }) => {
  if (!analysis) {
    return null;
  }

  const result = analysis.result || analysis;

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Sonuç
          </h2>

          <div className="flex flex-wrap gap-2">
            {analysis.cached && (
              <Badge variant="info">
                Kayıtlı sonuç
              </Badge>
            )}

           {analysis.model && (
  <Badge variant="secondary">
    Derkenar AI · Gelişmiş Hukuki Analiz
  </Badge>
)}

            {result.overallRiskLevel && (
              <Badge
                variant={
                  ['high', 'critical'].includes(
                    result.overallRiskLevel
                  )
                    ? 'danger'
                    : result.overallRiskLevel === 'medium'
                      ? 'warning'
                      : 'success'
                }
              >
               Risk:{' '}
{riskLabels[result.overallRiskLevel] ||
  result.overallRiskLevel}
              </Badge>
            )}
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        {result.documentType && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Belge Türü
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {result.documentType}
            </p>
          </section>
        )}

        {result.title && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Başlık
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {result.title}
            </p>
          </section>
        )}

        {result.summary && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Özet
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
              {result.summary}
            </p>
          </section>
        )}

        {Array.isArray(result.parties) &&
          result.parties.length > 0 && (
            <section>
              <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                Taraflar
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                {result.parties.map((party, index) => (
                  <div
                    key={`${party.name}-${index}`}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {party.name}
                    </p>

                    {party.role && (
                      <p className="text-sm text-gray-500">
                        {party.role}
                      </p>
                    )}

                    {party.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {party.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {Array.isArray(result.importantDates) &&
          result.importantDates.length > 0 && (
            <section>
              <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                Önemli Tarihler
              </h3>

              <div className="space-y-2">
                {result.importantDates.map((item, index) => (
                  <div
                    key={`${item.date}-${index}`}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </span>

                      <span className="text-sm text-gray-500">
                        {item.date}
                      </span>
                    </div>

                    {item.explanation && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {item.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {Array.isArray(result.risks) &&
          result.risks.length > 0 && (
            <section>
              <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                Riskler
              </h3>

              <div className="space-y-3">
                {result.risks.map((risk, index) => (
                  <div
                    key={`${risk.title}-${index}`}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {risk.title}
                      </p>

                      <Badge
                        variant={
                          ['high', 'critical'].includes(risk.level)
                            ? 'danger'
                            : risk.level === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {riskLabels[risk.level] || risk.level}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {risk.description}
                    </p>

                    {risk.recommendation && (
                      <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                        Öneri: {risk.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {Array.isArray(result.missingInformation) && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Eksik Bilgiler
            </h3>

            <ResultList items={result.missingInformation} />
          </section>
        )}

        {Array.isArray(result.recommendedActions) && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Önerilen İşlemler
            </h3>

            <ResultList items={result.recommendedActions} />
          </section>
        )}

        {result.draft && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Oluşturulan Şablon
            </h3>

            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
              {result.draft}
            </div>
          </section>
        )}

        {result.content && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Oluşturulan Şablon
            </h3>

            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
              {result.content}
            </div>
          </section>
        )}

        {result.shortAnswer && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Kısa Cevap
            </h3>

            <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
              {result.shortAnswer}
            </p>
          </section>
        )}

        {result.analysis && (
          <section>
            <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
              Hukuki Analiz
            </h3>

            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
              {result.analysis}
            </p>
          </section>
        )}

        {result.disclaimer && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            {result.disclaimer}
          </div>
        )}

        
      </Card.Body>
    </Card>
  );
};

const AIAssistant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorCacheKey = user?.id || 'anonymous';

  const [activeTab, setActiveTab] = useState('documents');
  const [selectedDocumentId, setSelectedDocumentId] =
    useState('');
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');
  const [draftType, setDraftType] = useState('petition');
  const [draftForm, setDraftForm] = useState(
    getInitialDraftForm()
  );
  const [result, setResult] = useState(null);
  const [showWorkspaceIntro, setShowWorkspaceIntro] = useState(() => {
    if (typeof window === 'undefined') return false;

    return (
      window.sessionStorage.getItem(
        'derkenar-ai-workspace-intro-shown'
      ) !== 'true'
    );
  });

  // AI çalışma alanına ilk girişte yalnızca kısa bir kurumsal geçiş göster.
  // Backend veya ek veri çağrısı yoktur; aynı tarayıcı oturumunda tekrar gösterilmez.
  useEffect(() => {
    if (!showWorkspaceIntro) return undefined;

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(
        'derkenar-ai-workspace-intro-shown',
        'true'
      );
      setShowWorkspaceIntro(false);
    }, 1350);

    return () => window.clearTimeout(timer);
  }, [showWorkspaceIntro]);

  // Kullanıcı kimliği değiştiğinde önceki hesabın seçili kaydı veya
  // AI sonucu ekranda kalmamalı.
  useEffect(() => {
    setSelectedDocumentId('');
    setResult(null);
  }, [actorCacheKey]);

  const documentsQuery = useQuery({
    queryKey: ['documents', 'ai-workspace', actorCacheKey],
    queryFn: () =>
      documentApi.getAll({
        page: 1,
        limit: 100,
      }),
    enabled: Boolean(user?.id),
  });

  const documents = useMemo(
    () => getDocumentsFromResponse(documentsQuery.data),
    [documentsQuery.data]
  );

  const analysesQuery = useQuery({
    queryKey: [
      'ai-document-analyses',
      actorCacheKey,
      selectedDocumentId,
    ],
    queryFn: () =>
      aiApi.getDocumentAnalyses(selectedDocumentId),
    enabled: Boolean(user?.id && selectedDocumentId),
  });

  const analyses = useMemo(() => {
    const payload = unwrapResponse(analysesQuery.data);
    return Array.isArray(payload) ? payload : [];
  }, [analysesQuery.data]);

  const analyzeMutation = useMutation({
    mutationFn: ({ documentId, force }) =>
      aiApi.analyzeDocument(documentId, { force }),

    onMutate: () => {
      setResult(null);
    },

    onSuccess: (response) => {
      const data = unwrapResponse(response);
      setResult(data);

      queryClient.invalidateQueries({
        queryKey: [
          'ai-document-analyses',
          actorCacheKey,
          selectedDocumentId,
        ],
      });

      toast.success(
        data?.cached
          ? 'Kayıtlı analiz getirildi'
          : 'Belge analizi tamamlandı'
      );
    },

    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          'Belge analizi başarısız'
      );
    },
  });

  const classifyMutation = useMutation({
    mutationFn: ({ documentId, force }) =>
      aiApi.classifyDocument(documentId, { force }),

    onMutate: () => {
      setResult(null);
    },

    onSuccess: (response) => {
      const data = unwrapResponse(response);
      setResult(data);

      queryClient.invalidateQueries({
        queryKey: [
          'ai-document-analyses',
          actorCacheKey,
          selectedDocumentId,
        ],
      });

      toast.success('Belge sınıflandırıldı');
    },

    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          'Belge sınıflandırılamadı'
      );
    },
  });

  const legalResearchMutation = useMutation({
    mutationFn: (data) =>
      aiApi.generateLegalResearch(data),

    onMutate: () => {
      setResult(null);
    },

    onSuccess: (response) => {
      setResult(unwrapResponse(response));
      toast.success(
        'Hukuki ön değerlendirme oluşturuldu'
      );
    },

    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          'Ön değerlendirme oluşturulamadı'
      );
    },
  });

  const draftMutation = useMutation({
    mutationFn: (data) =>
      aiApi.generateDraft(data),

    onMutate: () => {
      setResult(null);
    },

    onSuccess: (response) => {
      setResult(unwrapResponse(response));
      toast.success('Hukuki şablon oluşturuldu');
    },

    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          'Şablon oluşturulamadı'
      );
    },
  });

  const updateDraftField = (field, value) => {
    setDraftForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetDraftForm = () => {
    setDraftForm(getInitialDraftForm());
  };

  const handleAnalyze = (force = false) => {
    if (!selectedDocumentId) {
      toast.error('Önce bir belge seçin');
      return;
    }

    analyzeMutation.mutate({
      documentId: selectedDocumentId,
      force,
    });
  };

  const handleClassify = () => {
    if (!selectedDocumentId) {
      toast.error('Önce bir belge seçin');
      return;
    }

    classifyMutation.mutate({
      documentId: selectedDocumentId,
      force: false,
    });
  };

  const handleLegalResearch = () => {
    if (!query.trim()) {
      toast.error('Hukuki sorunuzu yazın');
      return;
    }

    legalResearchMutation.mutate({
      query: query.trim(),
      context: context.trim(),
    });
  };

  const handleDraft = () => {
    let data = null;

    if (draftType === 'petition') {
      if (!draftForm.subject.trim()) {
        toast.error('Dava konusunu girin');
        return;
      }

      if (!draftForm.facts.trim()) {
        toast.error('Olayları ve açıklamaları girin');
        return;
      }

      data = {
        court: draftForm.court.trim(),
        plaintiff: draftForm.plaintiff.trim(),
        defendant: draftForm.defendant.trim(),
        subject: draftForm.subject.trim(),
        facts: splitLines(draftForm.facts),
        claims: splitLines(draftForm.claims),
        evidence: splitLines(draftForm.evidence),
      };
    }

    if (draftType === 'contract') {
      if (!draftForm.contractTitle.trim()) {
        toast.error('Sözleşme adını girin');
        return;
      }

      if (!draftForm.firstParty.trim()) {
        toast.error('Birinci tarafı girin');
        return;
      }

      if (!draftForm.secondParty.trim()) {
        toast.error('İkinci tarafı girin');
        return;
      }

      if (!draftForm.scope.trim()) {
        toast.error('Sözleşmenin konusunu girin');
        return;
      }

      data = {
        title: draftForm.contractTitle.trim(),
        parties: [
          draftForm.firstParty.trim(),
          draftForm.secondParty.trim(),
        ],
        scope: draftForm.scope.trim(),
        paymentTerms:
          draftForm.paymentTerms.trim(),
        duration: draftForm.duration.trim(),
        specialTerms: splitLines(
          draftForm.specialTerms
        ),
      };
    }

    if (draftType === 'notice') {
      if (!draftForm.recipient.trim()) {
        toast.error('Muhatap bilgisini girin');
        return;
      }

      if (!draftForm.noticeSubject.trim()) {
        toast.error('İhtar konusunu girin');
        return;
      }

      if (!draftForm.description.trim()) {
        toast.error('Olay ve açıklamaları girin');
        return;
      }

      data = {
        recipient: draftForm.recipient.trim(),
        sender: draftForm.sender.trim(),
        subject: draftForm.noticeSubject.trim(),
        description:
          draftForm.description.trim(),
        requestedAction:
          draftForm.requestedAction.trim(),
        deadline: draftForm.deadline.trim(),
        consequences:
          draftForm.consequences.trim(),
      };
    }

    if (!data) {
      toast.error('Şablon bilgileri hazırlanamadı');
      return;
    }

    draftMutation.mutate({
      type: draftType,
      data,
    });
  };

  const handleShowAnalysis = async (analysisId) => {
    try {
      const response =
        await aiApi.getAnalysis(analysisId);

      setResult(unwrapResponse(response));
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Analiz kaydı getirilemedi'
      );
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] space-y-8 pb-8">
      {showWorkspaceIntro && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-slate-950 px-6"
          aria-live="polite"
          aria-label="Derkenar AI çalışma alanı hazırlanıyor"
        >
          <div className="absolute inset-0 opacity-60">
            <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute left-[20%] top-[25%] h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-[20%] right-[18%] h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto w-full max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-blue-950/40 backdrop-blur">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-blue-300" aria-hidden="true">
                <path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2L10 9l2-5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m18.5 4 .7 1.8L21 6.5l-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" fill="currentColor" opacity=".7" />
              </svg>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-300">Derkenar AI</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Yapay zekâ çalışma alanınız hazırlanıyor
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Hukuki analiz ve üretim araçlarınız güvenli çalışma alanında getiriliyor.
            </p>
            <div className="mx-auto mt-7 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-full origin-left animate-pulse rounded-full bg-blue-400" />
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 shadow-xl shadow-slate-950/10 dark:border-slate-800 sm:px-8 sm:py-10 lg:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-20 lg:block">
            <svg viewBox="0 0 320 220" fill="none" className="h-full w-full" aria-hidden="true">
              <path d="M30 55h82l36 36h118" stroke="white" strokeOpacity=".28" />
              <path d="M65 150h72l31-31h118" stroke="white" strokeOpacity=".18" />
              <circle cx="30" cy="55" r="4" fill="white" fillOpacity=".55" />
              <circle cx="65" cy="150" r="4" fill="white" fillOpacity=".4" />
              <circle cx="266" cy="91" r="4" fill="white" fillOpacity=".45" />
              <circle cx="286" cy="119" r="4" fill="white" fillOpacity=".3" />
            </svg>
          </div>
        </div>

        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              Derkenar AI · Aktif
            </span>
            <span className="text-xs font-medium text-slate-400">Gelişmiş Hukuki Analiz ve Üretim Merkezi</span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Derkenar AI Çalışma Alanı
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Belgelerinizi analiz edin, hukuki konuları yapılandırılmış biçimde değerlendirin ve çalışma taslaklarınızı tek bir profesyonel yapay zekâ alanından oluşturun.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Çalışma Araçları</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Nasıl çalışmak istiyorsunuz?</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Bir araç seçin ve çalışmaya başlayın.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              id: 'documents', eyebrow: '01', label: 'Belge Analizi',
              description: 'Dilekçe, sözleşme, tutanak ve UYAP UDF belgelerindeki hukuki bilgileri yapılandırın.',
              icon: <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true"><path d="M7 3.75h7l3 3V20.25H7V3.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3.75v3h3M9.5 11h5M9.5 14.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
            },
            {
              id: 'research', eyebrow: '02', label: 'Hukuki Ön Değerlendirme',
              description: 'Hukuki sorunları, olay örgüsünü ve bağlamı sistematik bir ilk değerlendirmeye dönüştürün.',
              icon: <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true"><path d="M12 3.5v17M6 7.5h12M8.25 7.5 5 13h6.5L8.25 7.5ZM15.75 7.5 12.5 13H19l-3.25-5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
            },
            {
              id: 'draft', eyebrow: '03', label: 'Şablon Oluşturma',
              description: 'Dilekçe, sözleşme ve ihtarname için avukat incelemesine hazır ilk çalışma taslağını üretin.',
              icon: <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true"><path d="M5 18.5V6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75v10.5A2.75 2.75 0 0 1 16.25 20H6.5A1.5 1.5 0 0 1 5 18.5Z" stroke="currentColor" strokeWidth="1.6" /><path d="m9 14 5.75-5.75 1 1L10 15l-2 .5.5-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>,
            },
          ].map((tool) => {
            const isActive = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => { setActiveTab(tool.id); setResult(null); }}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 ${isActive ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10 dark:border-blue-500/70 dark:bg-blue-500/10' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-blue-500/10 dark:group-hover:text-blue-300'}`}>{tool.icon}</div>
                  <span className={`text-xs font-semibold tracking-[0.18em] ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400'}`}>{tool.eyebrow}</span>
                </div>
                <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">{tool.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{tool.description}</p>
                <div className={`mt-5 flex items-center gap-2 text-sm font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 transition group-hover:text-blue-600 dark:text-slate-400'}`}>
                  {isActive ? 'Aktif çalışma alanı' : 'Çalışma alanını aç'} <span aria-hidden="true">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-900/10 dark:text-amber-200">
        <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true"><path d="M12 8v4.5M12 16h.01M10.25 4.75 3.7 16.1A2 2 0 0 0 5.43 19h13.14a2 2 0 0 0 1.73-2.9L13.75 4.75a2 2 0 0 0-3.5 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <p className="leading-6">Yapay zekâ çıktıları çalışma ve ön değerlendirme amaçlıdır. Hukuki işlemden önce avukat tarafından kontrol edilmelidir.</p>
      </div>

      <div className="border-t border-slate-200 pt-7 dark:border-slate-800">
      {activeTab === 'documents' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <Card.Header>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Kayıtlı Belgeyi Analiz Et
              </h2>
            </Card.Header>

            <Card.Body className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Belge
                </label>

                <select
                  value={selectedDocumentId}
                  onChange={(event) => {
                    setSelectedDocumentId(
                      event.target.value
                    );
                    setResult(null);
                  }}
                  disabled={documentsQuery.isLoading}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {documentsQuery.isLoading
                      ? 'Belgeler yükleniyor...'
                      : 'Bir belge seçin'}
                  </option>

                  {documents.map((document) => (
                    <option
                      key={document.id}
                      value={document.id}
                    >
                      {document.name ||
                        document.original_name}
                    </option>
                  ))}
                </select>

                {documentsQuery.isError && (
                  <p className="mt-2 text-sm text-red-600">
                    Belgeler yüklenemedi.
                  </p>
                )}
              </div>

              {selectedDocumentId && (
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  {(() => {
                    const document = documents.find(
                      (item) =>
                        item.id === selectedDocumentId
                    );

                    if (!document) {
                      return null;
                    }

                    return (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {document.name ||
                            document.original_name}
                        </p>

                        <p className="text-sm text-gray-500">
                          {document.mime_type} ·{' '}
                          {formatFileSize(
                            document.file_size
                          )}
                        </p>

                        {document.category && (
                          <p className="text-sm text-gray-500">
                            Kategori:{' '}
{categoryLabels[document.category] ||
  document.category}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  onClick={() => handleAnalyze(false)}
                  loading={analyzeMutation.isPending}
                  disabled={
                    !selectedDocumentId ||
                    classifyMutation.isPending
                  }
                >
                  Analiz Et
                </Button>

               

                <Button
                  variant="secondary"
                  onClick={() => handleAnalyze(true)}
                  disabled={
                    !selectedDocumentId ||
                    analyzeMutation.isPending ||
                    classifyMutation.isPending
                  }
                >
                  Yeniden Analiz
                </Button>
              </div>

              <AnalysisResult analysis={result} />
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Analiz Geçmişi
              </h2>
            </Card.Header>

            <Card.Body>
              {!selectedDocumentId ? (
                <p className="text-sm text-gray-500">
                  Geçmişi görmek için belge seçin.
                </p>
              ) : analysesQuery.isLoading ? (
                <p className="text-sm text-gray-500">
                  Analiz geçmişi yükleniyor...
                </p>
              ) : analyses.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Bu belge için analiz bulunmuyor.
                </p>
              ) : (
                <div className="space-y-3">
                  {analyses.map((analysis) => (
                    <button
                      key={analysis.id}
                      type="button"
                      onClick={() =>
                        handleShowAnalysis(analysis.id)
                      }
                      className="w-full rounded-lg border border-gray-200 p-3 text-left transition hover:border-blue-500 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {analysisTypeLabels[analysis.analysis_type] ||
  analysis.analysis_type}
                        </span>

                        <Badge
                          variant={
                            analysis.status === 'completed'
                              ? 'success'
                              : analysis.status === 'failed'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {analysisStatusLabels[analysis.status] ||
  analysis.status}
                        </Badge>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        {analysis.created_at
                          ? new Date(
                              analysis.created_at
                            ).toLocaleString('tr-TR')
                          : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {activeTab === 'research' && (
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Hukuki Ön Değerlendirme
            </h2>
          </Card.Header>

          <Card.Body className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hukuki soru
              </label>

              <textarea
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                rows={4}
                maxLength={10000}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="İncelenmesini istediğiniz hukuki soruyu yazın..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Olay ve bağlam
              </label>

              <textarea
                value={context}
                onChange={(event) =>
                  setContext(event.target.value)
                }
                rows={6}
                maxLength={50000}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Olayın ayrıntılarını, tarihleri ve tarafları yazın..."
              />
            </div>

            <Button
              onClick={handleLegalResearch}
              loading={
                legalResearchMutation.isPending
              }
              disabled={!query.trim()}
              className="w-full"
            >
              Ön Değerlendirme Oluştur
            </Button>

            <AnalysisResult analysis={result} />
          </Card.Body>
        </Card>
      )}

      {activeTab === 'draft' && (
        <Card>
          <Card.Header>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Hukuki Şablon Oluştur
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Belge bilgilerini doldurun. Yapay zekâ,
                avukat incelemesine hazır bir ilk şablon
                oluştursun.
              </p>
            </div>
          </Card.Header>

          <Card.Body className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Belge türü
              </label>

              <select
                value={draftType}
                onChange={(event) => {
                  setDraftType(event.target.value);
                  resetDraftForm();
                  setResult(null);
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="petition">
                  Dilekçe
                </option>
                <option value="contract">
                  Sözleşme
                </option>
                <option value="notice">
                  İhtarname
                </option>
              </select>
            </div>

            {draftType === 'petition' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mahkeme
                    </label>

                    <input
                      value={draftForm.court}
                      onChange={(event) =>
                        updateDraftField(
                          'court',
                          event.target.value
                        )
                      }
                      placeholder="İstanbul İş Mahkemesi"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dava konusu *
                    </label>

                    <input
                      value={draftForm.subject}
                      onChange={(event) =>
                        updateDraftField(
                          'subject',
                          event.target.value
                        )
                      }
                      placeholder="İşe iade ve işçilik alacakları"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Davacı
                    </label>

                    <input
                      value={draftForm.plaintiff}
                      onChange={(event) =>
                        updateDraftField(
                          'plaintiff',
                          event.target.value
                        )
                      }
                      placeholder="Davacı adı ve bilgileri"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Davalı
                    </label>

                    <input
                      value={draftForm.defendant}
                      onChange={(event) =>
                        updateDraftField(
                          'defendant',
                          event.target.value
                        )
                      }
                      placeholder="Davalı adı ve bilgileri"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Olaylar ve açıklamalar *
                  </label>

                  <textarea
                    value={draftForm.facts}
                    onChange={(event) =>
                      updateDraftField(
                        'facts',
                        event.target.value
                      )
                    }
                    rows={6}
                    placeholder={`Her olayı ayrı satıra yazın:
Müvekkil 6 yıldır davalı şirkette çalışmaktadır.
İş sözleşmesi yazılı bildirim yapılmadan feshedilmiştir.
Tazminat ödemesi yapılmamıştır.`}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Talepler
                    </label>

                    <textarea
                      value={draftForm.claims}
                      onChange={(event) =>
                        updateDraftField(
                          'claims',
                          event.target.value
                        )
                      }
                      rows={5}
                      placeholder={`Her talebi ayrı satıra yazın:
İşe iadeye karar verilmesi
Kıdem tazminatının tahsili
İhbar tazminatının tahsili`}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Deliller
                    </label>

                    <textarea
                      value={draftForm.evidence}
                      onChange={(event) =>
                        updateDraftField(
                          'evidence',
                          event.target.value
                        )
                      }
                      rows={5}
                      placeholder={`Her delili ayrı satıra yazın:
İş sözleşmesi
SGK hizmet dökümü
Maaş bordroları
Tanık beyanları`}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {draftType === 'contract' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sözleşme adı *
                  </label>

                  <input
                    value={draftForm.contractTitle}
                    onChange={(event) =>
                      updateDraftField(
                        'contractTitle',
                        event.target.value
                      )
                    }
                    placeholder="Hizmet Sözleşmesi"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Birinci taraf *
                    </label>

                    <input
                      value={draftForm.firstParty}
                      onChange={(event) =>
                        updateDraftField(
                          'firstParty',
                          event.target.value
                        )
                      }
                      placeholder="Birinci taraf bilgileri"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      İkinci taraf *
                    </label>

                    <input
                      value={draftForm.secondParty}
                      onChange={(event) =>
                        updateDraftField(
                          'secondParty',
                          event.target.value
                        )
                      }
                      placeholder="İkinci taraf bilgileri"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sözleşmenin konusu *
                  </label>

                  <textarea
                    value={draftForm.scope}
                    onChange={(event) =>
                      updateDraftField(
                        'scope',
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Tarafların vereceği hizmeti ve sözleşmenin kapsamını açıklayın."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ücret ve ödeme
                    </label>

                    <textarea
                      value={draftForm.paymentTerms}
                      onChange={(event) =>
                        updateDraftField(
                          'paymentTerms',
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Ücret, ödeme tarihi ve ödeme biçimi"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Süre
                    </label>

                    <textarea
                      value={draftForm.duration}
                      onChange={(event) =>
                        updateDraftField(
                          'duration',
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Başlangıç, bitiş ve uzama şartları"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Özel şartlar
                  </label>

                  <textarea
                    value={draftForm.specialTerms}
                    onChange={(event) =>
                      updateDraftField(
                        'specialTerms',
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder={`Her şartı ayrı satıra yazın:
Gizlilik yükümlülüğü
Rekabet yasağı
Gecikme cezası`}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            {draftType === 'notice' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gönderen
                    </label>

                    <input
                      value={draftForm.sender}
                      onChange={(event) =>
                        updateDraftField(
                          'sender',
                          event.target.value
                        )
                      }
                      placeholder="İhtar eden kişi veya şirket"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Muhatap *
                    </label>

                    <input
                      value={draftForm.recipient}
                      onChange={(event) =>
                        updateDraftField(
                          'recipient',
                          event.target.value
                        )
                      }
                      placeholder="İhtar edilen kişi veya şirket"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    İhtar konusu *
                  </label>

                  <input
                    value={draftForm.noticeSubject}
                    onChange={(event) =>
                      updateDraftField(
                        'noticeSubject',
                        event.target.value
                      )
                    }
                    placeholder="Ödenmeyen kira bedellerinin tahsili"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Olay ve açıklamalar *
                  </label>

                  <textarea
                    value={draftForm.description}
                    onChange={(event) =>
                      updateDraftField(
                        'description',
                        event.target.value
                      )
                    }
                    rows={6}
                    placeholder="İhtara neden olan olayları tarih sırasıyla açıklayın."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      İstenen işlem
                    </label>

                    <textarea
                      value={draftForm.requestedAction}
                      onChange={(event) =>
                        updateDraftField(
                          'requestedAction',
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="Muhatabın yapması gereken işlemi açıklayın."
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Süre
                    </label>

                    <input
                      value={draftForm.deadline}
                      onChange={(event) =>
                        updateDraftField(
                          'deadline',
                          event.target.value
                        )
                      }
                      placeholder="Örneğin: Tebliğden itibaren 7 gün"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uyulmaması halinde sonuç
                  </label>

                  <textarea
                    value={draftForm.consequences}
                    onChange={(event) =>
                      updateDraftField(
                        'consequences',
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="İcra takibi veya dava açılması gibi sonuçları belirtin."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              Oluşturulan şablon hukuki işlemden önce
              avukat tarafından kontrol edilmelidir.
            </div>

            <Button
              onClick={handleDraft}
              loading={draftMutation.isPending}
              className="w-full"
            >
              Şablon Oluştur
            </Button>

            <AnalysisResult analysis={result} />
          </Card.Body>
        </Card>
      )}
      </div>
    </div>
  );
};

export default AIAssistant;