import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import caseApi from '../../features/cases/case.api.js';
import documentApi from '../../features/documents/document.api.js';
import aiApi from '../../features/ai/ai.api.js';
import casePartyApi from '../../features/case-parties/case-party.api.js';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarDays,
  CheckCircle2,
  Edit2,
  ListTodo,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import toast from 'react-hot-toast';
// ======================================================
// UTC format fonksiyonları
// ======================================================

const formatDateUTC = (date) => {
  if (!date) return '-';

  try {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return '-';
    }

    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(
      d.getUTCMonth() + 1
    ).padStart(2, '0')}.${d.getUTCFullYear()}`;
  } catch {
    return '-';
  }
};

const formatDateTimeUTC = (date) => {
  if (!date) return '-';

  try {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return '-';
    }

    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(
      d.getUTCMonth() + 1
    ).padStart(2, '0')}.${d.getUTCFullYear()} ${String(
      d.getUTCHours()
    ).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
};

const unwrapResponse = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

// ======================================================
// Label yardımcıları
// ======================================================

const PARTY_LABELS = {
  davaci: 'Davacı',
  davali: 'Davalı',
  supheli: 'Şüpheli',
  sanik: 'Sanık',
  musteki: 'Müşteki',
  katilan: 'Katılan',
  alacakli: 'Alacaklı',
  borclu: 'Borçlu',
  ucuncu_kisi: 'Üçüncü Kişi',

  // Eski kayıtlarla uyumluluk
  plaintiff: 'Davacı',
  defendant: 'Davalı',
  intervener: 'Müdahil',
  witness: 'Tanık',
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

const RISK_LABELS = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
  undetermined: 'Belirsiz',
};

const ACTION_PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

const getRiskBadgeVariant = (level) => {
  switch (level) {
    case 'critical':
    case 'high':
      return 'danger';

    case 'medium':
      return 'warning';

    case 'low':
      return 'success';

    default:
      return 'default';
  }
};

const getActionPriorityVariant = (priority) => {
  switch (priority) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    case 'normal':
      return 'info';

    case 'low':
      return 'default';

    default:
      return 'default';
  }
};

// ======================================================
// AI PANEL
// ======================================================

const CaseAIAnalysis = ({
  analysis,
  onRefresh,
  refreshing,
}) => {
  if (!analysis) {
    return null;
  }

  const result =
    analysis.result || analysis;

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                AI Dava Analizi
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dava kayıtları, görevler, duruşmalar, toplantılar,
              belgeler ve notlar birlikte değerlendirildi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {analysis.cached && (
              <Badge variant="info">
                Kayıtlı analiz
              </Badge>
            )}

            {analysis.model && (
              <Badge variant="default">
                {analysis.model}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              onClick={onRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yeniden Analiz
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        {/* SKORLAR */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              Dosya Sağlığı
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {Number.isInteger(result.caseHealthScore)
                ? result.caseHealthScore
                : '-'}
              {Number.isInteger(result.caseHealthScore) && (
                <span className="text-base font-normal text-gray-400">
                  /100
                </span>
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Kazanma ihtimali değil; dosyanın hazırlık ve takip
              seviyesidir.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ShieldAlert className="h-4 w-4" />
              Risk Skoru
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {Number.isInteger(result.riskScore)
                ? result.riskScore
                : '-'}
              {Number.isInteger(result.riskScore) && (
                <span className="text-base font-normal text-gray-400">
                  /100
                </span>
              )}
            </p>

            <div className="mt-2">
              <Badge
                variant={getRiskBadgeVariant(
                  result.overallRiskLevel
                )}
              >
                {RISK_LABELS[result.overallRiskLevel] ||
                  result.overallRiskLevel ||
                  'Belirsiz'}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ListTodo className="h-4 w-4" />
              Açık Görev
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {result.workloadSummary?.openTaskCount ?? '-'}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Geciken:{' '}
              {result.workloadSummary?.overdueTaskCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays className="h-4 w-4" />
              Yaklaşan İşlem
            </div>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {(result.workloadSummary?.upcomingEventCount ?? 0) +
                (result.workloadSummary?.upcomingMeetingCount ?? 0)}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Duruşma/etkinlik:{' '}
              {result.workloadSummary?.upcomingEventCount ?? 0}
              {' · '}
              Toplantı:{' '}
              {result.workloadSummary?.upcomingMeetingCount ?? 0}
            </p>
          </div>
        </div>

        {/* GENEL ÖZET */}
        {result.overview && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Genel Değerlendirme
            </h3>

            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
              {result.overview}
            </p>
          </section>
        )}

        {/* MEVCUT DURUM */}
        {result.currentStatus && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              Mevcut Durum
            </h3>

            <div className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {result.currentStatus}
            </div>
          </section>
        )}

        {/* NEXT BEST ACTIONS */}
        {Array.isArray(result.nextBestActions) &&
          result.nextBestActions.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />

                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Önerilen Sonraki İşlemler
                </h3>
              </div>

              <div className="space-y-3">
                {result.nextBestActions.map((action, index) => (
                  <div
                    key={`${action.title}-${index}`}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {action.title}
                      </p>

                      <Badge
                        variant={getActionPriorityVariant(
                          action.priority
                        )}
                      >
                        {ACTION_PRIORITY_LABELS[action.priority] ||
                          action.priority}
                      </Badge>
                    </div>

                    {action.description && (
                      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {action.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      {action.suggestedDueDate && (
                        <span>
                          Önerilen tarih:{' '}
                          {formatDateUTC(action.suggestedDueDate)}
                        </span>
                      )}

                      {action.canCreateTask && (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          Göreve dönüştürülebilir
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* RİSKLER */}
        {Array.isArray(result.risks) &&
          result.risks.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />

                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Riskler
                </h3>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {result.risks.map((risk, index) => (
                  <div
                    key={`${risk.title}-${index}`}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {risk.title}
                      </p>

                      <Badge
                        variant={getRiskBadgeVariant(risk.level)}
                      >
                        {RISK_LABELS[risk.level] || risk.level}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {risk.description}
                    </p>

                    {risk.recommendation && (
                      <p className="mt-3 text-sm font-medium text-blue-700 dark:text-blue-300">
                        Öneri: {risk.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* TARİHLER */}
        {Array.isArray(result.upcomingDeadlines) &&
          result.upcomingDeadlines.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Yaklaşan Kritik Tarihler
              </h3>

              <div className="space-y-2">
                {result.upcomingDeadlines.map((item, index) => (
                  <div
                    key={`${item.date}-${index}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </p>

                      {item.explanation && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.explanation}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatDateTimeUTC(item.date)}
                      </p>

                      <Badge
                        variant={getRiskBadgeVariant(
                          item.importance
                        )}
                      >
                        {RISK_LABELS[item.importance] ||
                          item.importance}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* EKSİK BİLGİ / DELİL */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.isArray(result.missingInformation) &&
            result.missingInformation.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Eksik Bilgiler
                </h3>

                <ul className="space-y-2">
                  {result.missingInformation.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {Array.isArray(result.missingEvidence) &&
            result.missingEvidence.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Eksik Deliller
                </h3>

                <ul className="space-y-2">
                  {result.missingEvidence.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-900/20 dark:text-red-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
        </div>

        {/* STRATEJİ */}
        {Array.isArray(result.strategicConsiderations) &&
          result.strategicConsiderations.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Stratejik Değerlendirme
              </h3>

              <ul className="space-y-2">
                {result.strategicConsiderations.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-lg bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* MÜVEKKİL İLETİŞİMİ */}
        {Array.isArray(result.clientCommunicationNotes) &&
          result.clientCommunicationNotes.length > 0 && (
            <section>
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Müvekkil ile Görüşülebilecek Konular
              </h3>

              <ul className="space-y-2">
                {result.clientCommunicationNotes.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

        {/* HUMAN REVIEW */}
        {result.requiresHumanReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Avukat incelemesi gerekli
            </div>

            {Array.isArray(result.reviewReasons) &&
              result.reviewReasons.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                  {result.reviewReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}

        {Array.isArray(result.warnings) &&
          result.warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300">
                AI uyarılarını göster
              </summary>

              <ul className="mt-3 space-y-2">
                {result.warnings.map((warning, index) => (
                  <li
                    key={`${warning}-${index}`}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    • {warning}
                  </li>
                ))}
              </ul>
            </details>
          )}
      </Card.Body>
    </Card>
  );
};


// ======================================================
// AI DOSYA TAMAMLAMA PANELİ
// ======================================================

const CaseCompletionAnalysis = ({
  analysis,
  onRefresh,
  refreshing,
  selectedMissingParties,
  onToggleMissingParty,
  onAddSelectedMissingParties,
  addingMissingParties,
  selectedCaseUpdates,
  onToggleCaseUpdate,
  onApplySelectedCaseUpdates,
  applyingCaseUpdates,
}) => {
  if (!analysis) {
    return null;
  }

  const result = analysis.result || analysis;

  const missingParties = Array.isArray(result.missingParties)
    ? result.missingParties
    : [];

  const partyConflicts = Array.isArray(result.partyConflicts)
    ? result.partyConflicts
    : [];

  const suggestedCaseUpdates = Array.isArray(result.suggestedCaseUpdates)
    ? result.suggestedCaseUpdates
    : [];

  const importantDateSuggestions = Array.isArray(
    result.importantDateSuggestions
  )
    ? result.importantDateSuggestions
    : [];

  const warnings = Array.isArray(result.warnings)
    ? result.warnings
    : [];

  const reviewReasons = Array.isArray(result.reviewReasons)
    ? result.reviewReasons
    : [];

  const hasSuggestions =
    missingParties.length > 0 ||
    partyConflicts.length > 0 ||
    suggestedCaseUpdates.length > 0 ||
    importantDateSuggestions.length > 0 ||
    warnings.length > 0;

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                AI ile Dosyayı Tamamla
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dava kaydı ile analiz edilmiş belgeler karşılaştırıldı.
              Öneriler otomatik uygulanmaz.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {analysis.cached && (
              <Badge variant="info">
                Kayıtlı analiz
              </Badge>
            )}

            {typeof result.confidence === 'number' && (
              <Badge variant="default">
                Güven %{Math.round(result.confidence * 100)}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              disabled={refreshing}
              onClick={onRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Yeniden Tara
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        {!hasSuggestions && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            Analiz edilmiş belgeler ile mevcut dava kaydı arasında
            belirgin bir eksik veya çelişki bulunmadı.
          </div>
        )}

        {missingParties.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-violet-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Belgelerde Bulunan Eksik Taraflar
              </h3>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
  {missingParties.map((party, index) => {
    const key = `${party.name}-${party.role}`;

    const checked =
      selectedMissingParties.includes(key);

    return (
      <label
        key={`${party.name}-${party.sourceDocumentId || index}`}
        className={`block cursor-pointer rounded-xl border p-4 transition ${
          checked
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={() =>
              onToggleMissingParty(party)
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {party.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {party.entityType || 'belirsiz'}
                  {' · '}
                  {party.role || 'belirsiz'}
                </p>
              </div>

              {typeof party.confidence === 'number' && (
                <Badge variant="default">
                  %{Math.round(party.confidence * 100)}
                </Badge>
              )}
            </div>

            {party.description && (
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {party.description}
              </p>
            )}

            {party.representative && (
              <p className="mt-2 text-sm text-gray-500">
                Temsilci: {party.representative}
              </p>
            )}
          </div>
        </div>
      </label>
    );
  })}
</div>

<div className="mt-4 flex flex-wrap items-center gap-3">
  <Button
    type="button"
    disabled={
      selectedMissingParties.length === 0 ||
      addingMissingParties
    }
    loading={addingMissingParties}
    onClick={onAddSelectedMissingParties}
  >
    Seçilen Tarafları Davaya Ekle
  </Button>

  {selectedMissingParties.length > 0 && (
    <span className="text-sm text-gray-500">
      {selectedMissingParties.length} taraf seçildi
    </span>
  )}
</div>
            
          </section>
        )}

        {partyConflicts.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Taraf Çelişkileri
              </h3>
            </div>

            <div className="space-y-3">
              {partyConflicts.map((conflict, index) => (
                <div
                  key={`${conflict.partyName}-${conflict.field}-${index}`}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-amber-950 dark:text-amber-100">
                      {conflict.partyName}
                    </p>

                    <Badge variant="warning">
                      {conflict.field}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Sistemde
                      </p>
                      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                        {conflict.currentValue ?? '-'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Belgede önerilen
                      </p>
                      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                        {conflict.suggestedValue ?? '-'}
                      </p>
                    </div>
                  </div>

                  {conflict.explanation && (
                    <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
                      {conflict.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {suggestedCaseUpdates.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Önerilen Dava Bilgisi Güncellemeleri
            </h3>

            <div className="space-y-3">
              {suggestedCaseUpdates.map((item, index) => {
  const checked =
    selectedCaseUpdates.includes(item.field);

  return (
    <label
      key={`${item.field}-${index}`}
      className={`block cursor-pointer rounded-xl border p-4 transition ${
        checked
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={() =>
            onToggleCaseUpdate(item)
          }
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
        />

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white">
              {item.field}
            </p>

            {item.requiresHumanConfirmation && (
              <Badge variant="warning">
                Onay gerekli
              </Badge>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Mevcut
              </p>

              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                {item.currentValue ?? '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Önerilen
              </p>

              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                {item.suggestedValue ?? '-'}
              </p>
            </div>
          </div>

          {item.reason && (
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {item.reason}
            </p>
          )}
        </div>
      </div>
    </label>
  );
})}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={
                    selectedCaseUpdates.length === 0 ||
                    applyingCaseUpdates
                  }
                  loading={applyingCaseUpdates}
                  onClick={onApplySelectedCaseUpdates}
                >
                  Seçilen Güncellemeleri Uygula
                </Button>

                {selectedCaseUpdates.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedCaseUpdates.length} güncelleme seçildi
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {importantDateSuggestions.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              Belgelerden Tespit Edilen Önemli Tarihler
            </h3>

            <div className="space-y-2">
              {importantDateSuggestions.map((item, index) => (
                <div
                  key={`${item.date}-${item.label}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </p>

                    {item.explanation && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.explanation}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDateTimeUTC(item.date)}
                    </p>

                    <Badge variant={getRiskBadgeVariant(item.importance)}>
                      {RISK_LABELS[item.importance] ||
                        item.importance ||
                        'Belirsiz'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {result.requiresHumanReview && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Avukat onayı gerekli
            </div>

            {reviewReasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
                {reviewReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300">
              Dosya tamamlama uyarılarını göster
            </summary>

            <ul className="mt-3 space-y-2">
              {warnings.map((warning, index) => (
                <li
                  key={`${warning}-${index}`}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  • {warning}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card.Body>
    </Card>
  );
};

// ======================================================
// CASE DETAIL
// ======================================================

const CaseDetail = () => {
  const { id } = useParams();

  const queryClient = useQueryClient();

  const [caseCompletion, setCaseCompletion] =
    useState(null);

  const [
    selectedMissingParties,
    setSelectedMissingParties,
  ] = useState([]);
  const [
  selectedCaseUpdates,
  setSelectedCaseUpdates,
] = useState([]);
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getOne(id),
    enabled: Boolean(id),
  });

  const caseItem =
    data?.data?.data;

  const aiSummaryMutation =
    useMutation({
      mutationFn: ({
        force = false,
      }) =>
        aiApi.summarizeCase(
          id,
          {
            force,
          }
        ),

      onSuccess: (
        response
      ) => {
        const result =
          unwrapResponse(
            response
          );

        toast.success(
          result?.cached
            ? 'Kayıtlı AI analizi getirildi'
            : 'Dava AI analizi tamamlandı'
        );
      },

      onError: (error) => {
        console.error(
          'Case AI error:',
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            'Dava AI analizi oluşturulamadı'
        );
      },
    });


  const caseCompletionMutation =
    useMutation({
      mutationFn: ({
        force = false,
      } = {}) =>
        aiApi.analyzeCaseCompletion(
          id,
          {
            force,
          }
        ),

      onSuccess: (response) => {
        const result =
          unwrapResponse(
            response
          );

        setCaseCompletion(
          result
        );
        setSelectedMissingParties([]);
        setSelectedCaseUpdates([]);

        toast.success(
          result?.cached
            ? 'Kayıtlı dosya tamamlama analizi getirildi'
            : 'AI dosya tamamlama analizi tamamlandı'
        );
      },

      onError: (error) => {
        console.error(
          'Case completion error:',
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            'Dosya tamamlama analizi oluşturulamadı'
        );
      },
    });
const addMissingPartiesMutation =
  useMutation({
    mutationFn: async (parties) => {
      const results = [];

      for (const party of parties) {
        const payload = {
          name: party.name,

          party_type: (() => {
            const roleMap = {
  sanık: 'sanik',
  şüpheli: 'supheli',
  müşteki: 'musteki',
  şikayetçi: 'musteki',
  katılan: 'katilan',
  davacı: 'davaci',
  davalı: 'davali',
  mağdur: 'magdur',
  magdur: 'magdur',
  maktul: 'maktul',
  tanık: 'ucuncu_kisi',
};

            return roleMap[party.role] || 'other';
          })(),

          lawyer_name:
            party.representative || null,

          notes:
            party.description || null,
        };

        const response =
          await casePartyApi.create(
            id,
            payload
          );

        results.push(response);
      }

      return results;
    },

    onSuccess: async (_, parties) => {
      await queryClient.invalidateQueries({
        queryKey: ['case', id],
      });

      setSelectedMissingParties([]);

      toast.success(
        `${parties.length} taraf davaya eklendi`
      );
    },

    onError: (error) => {
      console.error(
        'Taraf ekleme hatası:',
        error
      );

      toast.error(
        error.response?.data?.message ||
        'Taraflar eklenemedi'
      );
    },
  });
  const applyCaseUpdatesMutation = useMutation({
  mutationFn: async (updates) => {
    const payload = {};

    for (const item of updates) {
      payload[item.field] = item.suggestedValue;
    }

    return caseApi.patch(id, payload);
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ['case', id],
    });

    setSelectedCaseUpdates([]);

    toast.success(
      'Seçilen dava bilgileri güncellendi'
    );
  },

  onError: (error) => {
    console.error(
      'Dava güncelleme hatası:',
      error
    );

    toast.error(
      error.response?.data?.message ||
        'Dava bilgileri güncellenemedi'
    );
  },
});

  const toggleMissingParty = (party) => {
  const key = `${party.name}-${party.role}`;

  setSelectedMissingParties((current) => {
    if (current.includes(key)) {
      return current.filter(
        (item) => item !== key
      );
    }

    return [
      ...current,
      key,
    ];
  });
};
const toggleCaseUpdate = (item) => {
  const key = item.field;

  setSelectedCaseUpdates((current) => {
    if (current.includes(key)) {
      return current.filter(
        (value) => value !== key
      );
    }

    return [
      ...current,
      key,
    ];
  });
};

const handleAddSelectedMissingParties = () => {
  const missingParties =
    caseCompletion?.result
      ?.missingParties ||
    caseCompletion?.missingParties ||
    [];

  const selected =
    missingParties.filter(
      (party) =>
        selectedMissingParties.includes(
          `${party.name}-${party.role}`
        )
    );

  if (selected.length === 0) {
    toast.error(
      'En az bir taraf seçin'
    );

    return;
  }

  addMissingPartiesMutation.mutate(
    selected
  );
};
const handleApplySelectedCaseUpdates = () => {
  const suggestedCaseUpdates =
    caseCompletion?.result?.suggestedCaseUpdates ||
    caseCompletion?.suggestedCaseUpdates ||
    [];

  const selected =
    suggestedCaseUpdates.filter((item) =>
      selectedCaseUpdates.includes(item.field)
    );

  if (selected.length === 0) {
    toast.error('En az bir dava bilgisi seçin');
    return;
  }

  applyCaseUpdatesMutation.mutate(selected);
};

  const aiAnalysis =
    aiSummaryMutation.data
      ? unwrapResponse(
          aiSummaryMutation.data
        )
      : null;

  const handleAIAnalysis = (
    force = false
  ) => {
    if (!id) {
      return;
    }

    aiSummaryMutation.mutate({
      force,
    });
  };


  const handleCaseCompletion = (
    force = false
  ) => {
    if (!id) {
      return;
    }

    caseCompletionMutation.mutate({
      force,
    });
  };

  const handleDownload =
    async (doc) => {
      try {
        const response =
          await documentApi.download(
            doc.id
          );

        const blob =
          new Blob([
            response.data,
          ]);

        const url =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            'a'
          );

        link.href = url;

        link.download =
          doc.original_name ||
          doc.name;

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        window.URL.revokeObjectURL(
          url
        );

        toast.success(
          'Dosya indirildi'
        );
      } catch (error) {
        console.error(
          'Download error:',
          error
        );

        toast.error(
          'Dosya indirilemedi'
        );
      }
    };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (
    error ||
    !caseItem
  ) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">
          Dava bulunamadı
        </p>

        <Link
          to="/cases"
          className="text-blue-600 hover:underline"
        >
          ← Davalara Dön
        </Link>
      </div>
    );
  }

  const statuses = [
    {
      value: 'preparation',
      label: 'Hazırlık',
    },
    {
      value: 'active',
      label: 'Devam Ediyor',
    },
    {
      value: 'hearing',
      label: 'Duruşmada',
    },
    {
      value: 'appeal',
      label: 'İstinaf',
    },
    {
      value: 'cassation',
      label: 'Temyiz',
    },
    {
      value: 'concluded',
      label: 'Sonuçlandı',
    },
    {
      value: 'archived',
      label: 'Arşivlendi',
    },
  ];

  const getStatusVariant = (
    status
  ) => {
    switch (status) {
      case 'preparation':
        return 'warning';

      case 'active':
        return 'success';

      case 'hearing':
        return 'info';

      case 'appeal':
        return 'warning';

      case 'cassation':
        return 'default';

      case 'concluded':
        return 'default';

      case 'archived':
        return 'danger';

      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/cases"
            className="text-blue-600 hover:underline"
          >
            ← Davalar
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {caseItem.title ||
              caseItem.judiciary_type ||
              'Dava'}
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">
              {caseItem.case_number ||
                'Esas no yok'}
            </span>

            <Badge
              variant={getStatusVariant(
                caseItem.status
              )}
            >
              {statuses.find(
                (status) =>
                  status.value ===
                  caseItem.status
              )?.label ||
                caseItem.status}
            </Badge>

            {caseItem.judiciary_type && (
              <Badge variant="default">
                {caseItem.judiciary_type}
              </Badge>
            )}

            {caseItem.judiciary_unit && (
              <Badge variant="default">
                {caseItem.judiciary_unit}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              handleAIAnalysis(
                false
              )
            }
            loading={
              aiSummaryMutation.isPending
            }
            disabled={
              aiSummaryMutation.isPending
            }
          >
            <Brain className="mr-2 h-4 w-4" />
            AI Analiz Et
          </Button>


          <Button
            type="button"
            variant="outline"
            onClick={() =>
              handleCaseCompletion(
                false
              )
            }
            loading={
              caseCompletionMutation.isPending
            }
            disabled={
              caseCompletionMutation.isPending
            }
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI ile Dosyayı Tamamla
          </Button>

          <Link
            to={`/cases/${caseItem.id}/edit`}
          >
            <Button
              variant="outline"
              size="sm"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
          </Link>
        </div>
      </div>

      {/* AI ANALYSIS */}
      <CaseAIAnalysis
        analysis={aiAnalysis}
        refreshing={
          aiSummaryMutation.isPending
        }
        onRefresh={() =>
          handleAIAnalysis(true)
        }
      />

      <CaseCompletionAnalysis
  analysis={caseCompletion}
  refreshing={
    caseCompletionMutation.isPending
  }
  onRefresh={() =>
    handleCaseCompletion(true)
  }
  selectedMissingParties={
    selectedMissingParties
  }
  onToggleMissingParty={
    toggleMissingParty
  }
  onAddSelectedMissingParties={
    handleAddSelectedMissingParties
  }
  addingMissingParties={
    addMissingPartiesMutation.isPending
  }
  selectedCaseUpdates={
    selectedCaseUpdates
  }
  onToggleCaseUpdate={
    toggleCaseUpdate
  }
  onApplySelectedCaseUpdates={
    handleApplySelectedCaseUpdates
  }
  applyingCaseUpdates={
    applyCaseUpdatesMutation.isPending
  }
/>

      {/* BİLGİLER + TARAFLAR */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              📋 Bilgiler
            </h2>
          </Card.Header>

          <Card.Body className="space-y-3">
            {caseItem.judiciary_type && (
              <div>
                <p className="text-sm text-gray-500">
                  Yargı Türü
                </p>

                <p className="text-gray-900 dark:text-white">
                  {caseItem.judiciary_type}
                </p>
              </div>
            )}

            {caseItem.judiciary_unit && (
              <div>
                <p className="text-sm text-gray-500">
                  Yargı Birimi
                </p>

                <p className="text-gray-900 dark:text-white">
                  {caseItem.judiciary_unit}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">
                Mahkeme
              </p>

              <p className="text-gray-900 dark:text-white">
                {caseItem.court_name ||
                  '-'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Dosya No
              </p>

              <p className="text-gray-900 dark:text-white">
                {caseItem.case_number ||
                  '-'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Açılış Tarihi
              </p>

              <p className="text-gray-900 dark:text-white">
                {formatDateUTC(
                  caseItem.opening_date
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Müvekkiller
              </p>

              {caseItem.clients?.length >
              0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {caseItem.clients.map(
                    (client) => (
                      <Link
                        key={
                          client.id
                        }
                        to={`/clients/${client.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {client.name}
                      </Link>
                    )
                  )}
                </div>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  -
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Atanan Avukat
              </p>

              <p className="text-gray-900 dark:text-white">
                {caseItem.assignee
                  ? `${caseItem.assignee.first_name || ''} ${
                      caseItem.assignee.last_name || ''
                    }`.trim()
                  : 'Atanmadı'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Öncelik
              </p>

              <Badge
                variant={
                  caseItem.priority ===
                  'critical'
                    ? 'danger'
                    : caseItem.priority ===
                        'high'
                      ? 'warning'
                      : 'default'
                }
              >
                {PRIORITY_LABELS[
                  caseItem.priority
                ] ||
                  caseItem.priority ||
                  'Normal'}
              </Badge>
            </div>

            {caseItem.subject && (
              <div>
                <p className="text-sm text-gray-500">
                  Konu
                </p>

                <p className="text-gray-900 dark:text-white">
                  {caseItem.subject}
                </p>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* TARAFLAR */}
        <Card>
          <Card.Header className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              👥 Taraflar
            </h2>

            <Link
              to={`/cases/${caseItem.id}/parties/create`}
            >
              <Button size="sm">
                + Taraf Ekle
              </Button>
            </Link>
          </Card.Header>

          <Card.Body>
            {!caseItem.parties ||
            caseItem.parties.length ===
              0 ? (
              <p className="text-gray-500">
                Henüz taraf eklenmemiş
              </p>
            ) : (
              <div className="space-y-3">
                {caseItem.parties.map(
                  (party) => (
                    <div
                      key={party.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {party.name}
                        </p>

                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {PARTY_LABELS[
                            party.party_type
                          ] ||
                            party.party_type ||
                            'Taraf'}
                        </p>
                      </div>

                      {party.lawyer_name && (
                        <span className="text-sm text-gray-500">
                          Av.{' '}
                          {
                            party.lawyer_name
                          }
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* AÇIKLAMA */}
      {caseItem.description && (
        <Card>
          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              📝 Açıklama
            </h2>
          </Card.Header>

          <Card.Body>
            <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
              {caseItem.description}
            </p>
          </Card.Body>
        </Card>
      )}

      {/* BELGELER */}
      <Card>
        <Card.Header className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            📄 Belgeler
          </h2>

          <Link
            to={`/documents/upload?case=${caseItem.id}`}
          >
            <Button size="sm">
              + Belge Ekle
            </Button>
          </Link>
        </Card.Header>

        <Card.Body>
          {!caseItem.documents ||
          caseItem.documents.length ===
            0 ? (
            <p className="text-gray-500">
              Henüz belge eklenmemiş
            </p>
          ) : (
            <div className="space-y-3">
              {caseItem.documents.map(
                (doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <Link
                      to={`/documents/${doc.id}`}
                      className="flex-1 hover:underline"
                    >
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {doc.name}
                      </p>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDateUTC(
                          doc.created_at
                        )}
                        {' - '}
                        {(
                          Number(
                            doc.file_size ||
                              0
                          ) / 1024
                        ).toFixed(1)}{' '}
                        KB
                      </p>
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(
                          doc
                        )
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      ⬇️ İndir
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* GÖREVLER */}
      <Card>
        <Card.Header className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            ✅ Görevler
          </h2>

          <Link
            to={`/tasks/create?case=${caseItem.id}`}
          >
            <Button size="sm">
              + Görev Ekle
            </Button>
          </Link>
        </Card.Header>

        <Card.Body>
          {!caseItem.tasks ||
          caseItem.tasks.length ===
            0 ? (
            <p className="text-gray-500">
              Henüz görev eklenmemiş
            </p>
          ) : (
            <div className="space-y-3">
              {caseItem.tasks.map(
                (task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </p>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Atanan:{' '}
                        {task.assignee
                          ? `${task.assignee.first_name || ''} ${
                              task.assignee.last_name || ''
                            }`.trim()
                          : 'Atanmadı'}
                        {' - '}
                        Son tarih:{' '}
                        {formatDateUTC(
                          task.due_date
                        )}
                      </p>
                    </div>

                    <Badge
                      variant={
                        task.status ===
                        'completed'
                          ? 'success'
                          : task.status ===
                              'in_progress'
                            ? 'warning'
                            : task.status ===
                                'cancelled'
                              ? 'danger'
                              : 'default'
                      }
                    >
                      {task.status ===
                      'pending'
                        ? 'Bekliyor'
                        : task.status ===
                            'in_progress'
                          ? 'Devam Ediyor'
                          : task.status ===
                              'completed'
                            ? 'Tamamlandı'
                            : 'İptal'}
                    </Badge>
                  </Link>
                )
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* DURUŞMALAR */}
      <Card>
        <Card.Header className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            📅 Duruşmalar
          </h2>

          <Link
            to={`/events/create?case=${caseItem.id}`}
          >
            <Button size="sm">
              + Duruşma Ekle
            </Button>
          </Link>
        </Card.Header>

        <Card.Body>
          {!caseItem.events ||
          caseItem.events.length ===
            0 ? (
            <p className="text-gray-500">
              Henüz duruşma eklenmemiş
            </p>
          ) : (
            <div className="space-y-3">
              {caseItem.events.map(
                (event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </p>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTimeUTC(
                          event.start_date
                        )}
                        {' - '}
                        {event.location ||
                          'Yer belirtilmemiş'}
                      </p>
                    </div>

                    <Badge
                      variant={
                        event.status ===
                        'completed'
                          ? 'success'
                          : event.status ===
                              'ongoing'
                            ? 'warning'
                            : event.status ===
                                'cancelled'
                              ? 'danger'
                              : 'default'
                      }
                    >
                      {event.status ===
                      'scheduled'
                        ? 'Planlandı'
                        : event.status ===
                            'ongoing'
                          ? 'Devam Ediyor'
                          : event.status ===
                              'completed'
                            ? 'Tamamlandı'
                            : 'İptal'}
                    </Badge>
                  </Link>
                )
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default CaseDetail;