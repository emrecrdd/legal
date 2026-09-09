import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../app/providers/auth.provider.jsx';

const ONBOARDING_VERSION = 'v1';
const START_EVENT = 'derkenar:onboarding:start';

const STEP_DEFINITIONS = [
  {
    id: 'welcome',
    title: 'Derkenar’a hoş geldiniz',
    description:
      'Kısa bir turla temel çalışma alanlarını tanıyalım. Bu turu istediğiniz zaman kapatabilir ve daha sonra yeniden başlatabilirsiniz.',
    target: null,
  },
  {
    id: 'clients',
    title: 'Müvekkiller',
    description:
      'Müvekkil kayıtlarını, iletişim bilgilerini, bağlı davaları ve finans özetlerini buradan yönetebilirsiniz.',
    hrefs: ['/clients'],
    texts: ['Müvekkiller'],
  },
  {
    id: 'cases',
    title: 'Davalar',
    description:
      'Dava dosyalarını, tarafları, duruşmaları, belgeleri ve dosyaya bağlı çalışma akışlarını tek yerden takip edin.',
    hrefs: ['/cases'],
    texts: ['Davalar'],
  },
  {
    id: 'documents',
    title: 'Belgeler',
    description:
      'Dosya belgelerini yükleyin, görüntüleyin ve desteklenen belgeleri yapay zekâ analizi için kullanın.',
    hrefs: ['/documents'],
    texts: ['Belgeler'],
  },
  {
    id: 'tasks',
    title: 'Görevler',
    description:
      'Ofis içi işleri sorumlulara atayın, öncelik ve tarih belirleyin, tamamlanma durumunu takip edin.',
    hrefs: ['/tasks'],
    texts: ['Görevler'],
  },
  {
    id: 'calendar',
    title: 'Takvim',
    description:
      'Duruşma, toplantı, görev ve diğer tarihli işlerinizi takvim üzerinden birlikte takip edin.',
    hrefs: ['/calendar'],
    texts: ['Takvim'],
  },
  {
    id: 'finance',
    title: 'Finans',
    description:
      'Ücret anlaşmaları, alacaklar, tahsilatlar, ödeme planları, giderler ve kasa/banka hareketlerini yönetin.',
    hrefs: ['/finance'],
    texts: ['Finans'],
  },
  {
    id: 'search',
    title: 'Global Arama',
    description:
      'Müvekkil, dava, danışmanlık, belge, görev ve not kayıtlarını tek noktadan arayın.',
    hrefs: ['/search'],
    texts: ['Global Arama'],
  },
  {
    id: 'ai',
    title: 'AI Asistan',
    description:
      'Derkenar yalnızca kayıt tutmaz. Dosya ve belgeler üzerinden riskleri, eksik bilgileri, önemli tarihleri ve önerilen işlemleri ortaya çıkararak avukatın değerlendirmesine destek olur.',
    hrefs: ['/ai', '/ai-assistant', '/assistant'],
    texts: ['AI Asistan'],
  },
];

const escapeSelector = (value) => {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
};

const findByText = (texts = []) => {
  const candidates = Array.from(
    document.querySelectorAll('a, button, [role="button"], [role="link"]')
  );

  return (
    candidates.find((element) => {
      const text = element.textContent?.replace(/\s+/g, ' ').trim();
      return texts.some((label) => text === label || text?.includes(label));
    }) || null
  );
};

const findTarget = (step) => {
  if (!step || step.target === null) return null;

  for (const href of step.hrefs || []) {
    const exact = document.querySelector(`a[href="${escapeSelector(href)}"]`);
    if (exact) return exact;

    const startsWith = document.querySelector(
      `a[href^="${escapeSelector(href)}/"], a[href^="${escapeSelector(href)}?"]`
    );
    if (startsWith) return startsWith;
  }

  return findByText(step.texts);
};

const storageKeyFor = (user) =>
  `derkenar:onboarding:${ONBOARDING_VERSION}:${user?.id || user?.email || 'anonymous'}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTooltipPosition = (rect) => {
  const width = Math.min(390, window.innerWidth - 32);
  const estimatedHeight = 260;
  const gap = 16;

  if (!rect) {
    return {
      width,
      left: (window.innerWidth - width) / 2,
      top: Math.max(24, (window.innerHeight - estimatedHeight) / 2),
    };
  }

  const roomRight = window.innerWidth - rect.right;
  const roomLeft = rect.left;
  const roomBelow = window.innerHeight - rect.bottom;

  let left;
  let top;

  if (roomRight >= width + gap) {
    left = rect.right + gap;
    top = rect.top;
  } else if (roomLeft >= width + gap) {
    left = rect.left - width - gap;
    top = rect.top;
  } else {
    left = clamp(rect.left, 16, window.innerWidth - width - 16);
    top = roomBelow >= estimatedHeight + gap
      ? rect.bottom + gap
      : rect.top - estimatedHeight - gap;
  }

  return {
    width,
    left: clamp(left, 16, window.innerWidth - width - 16),
    top: clamp(top, 16, window.innerHeight - estimatedHeight - 16),
  };
};

const OverlayPieces = ({ rect }) => {
  if (!rect) {
    return <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-[1px]" />;
  }

  const padding = 8;
  const left = Math.max(0, rect.left - padding);
  const top = Math.max(0, rect.top - padding);
  const right = Math.min(window.innerWidth, rect.right + padding);
  const bottom = Math.min(window.innerHeight, rect.bottom + padding);

  const common = 'fixed bg-slate-950/55 backdrop-blur-[1px]';

  return (
    <>
      <div className={common} style={{ left: 0, top: 0, right: 0, height: top }} />
      <div className={common} style={{ left: 0, top, width: left, height: bottom - top }} />
      <div className={common} style={{ left: right, right: 0, top, height: bottom - top }} />
      <div className={common} style={{ left: 0, right: 0, top: bottom, bottom: 0 }} />
      <div
        className="pointer-events-none fixed rounded-xl ring-2 ring-blue-400 ring-offset-4 ring-offset-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_40px_rgba(15,23,42,0.28)]"
        style={{ left, top, width: right - left, height: bottom - top }}
      />
    </>
  );
};

export const startDerkenarOnboarding = () => {
  window.dispatchEvent(new CustomEvent(START_EVENT));
};

export default function DerkenarOnboarding() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [availableSteps, setAvailableSteps] = useState([STEP_DEFINITIONS[0]]);

  const storageKey = useMemo(() => storageKeyFor(user), [user]);

  const close = useCallback(
    (completed = false) => {
      setOpen(false);
      setTargetRect(null);

      if (completed) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ completed: true, completedAt: new Date().toISOString() })
        );
      }
    },
    [storageKey]
  );

  const buildSteps = useCallback(() => {
    const steps = STEP_DEFINITIONS.filter((step) => {
      if (step.target === null) return true;
      return Boolean(findTarget(step));
    });

    setAvailableSteps(steps.length ? steps : [STEP_DEFINITIONS[0]]);
    return steps.length ? steps : [STEP_DEFINITIONS[0]];
  }, []);

  const start = useCallback(() => {
    const steps = buildSteps();
    setStepIndex(0);
    setOpen(true);

    requestAnimationFrame(() => {
      const element = findTarget(steps[0]);
      setTargetRect(element?.getBoundingClientRect?.() || null);
    });
  }, [buildSteps]);

  useEffect(() => {
    if (!user) return undefined;

    const onStart = () => start();
    window.addEventListener(START_EVENT, onStart);

    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : null;

    if (!parsed?.completed) {
      const timeout = window.setTimeout(start, 900);
      return () => {
        window.clearTimeout(timeout);
        window.removeEventListener(START_EVENT, onStart);
      };
    }

    return () => window.removeEventListener(START_EVENT, onStart);
  }, [storageKey, user, start]);

  useEffect(() => {
    if (!open) return undefined;

    const update = () => {
      const step = availableSteps[stepIndex];
      const element = findTarget(step);
      if (element) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
      window.setTimeout(() => {
        const fresh = findTarget(step);
        setTargetRect(fresh?.getBoundingClientRect?.() || null);
      }, 180);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, stepIndex, availableSteps]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'ArrowRight') {
        setStepIndex((current) => Math.min(current + 1, availableSteps.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close, availableSteps.length]);

  if (!open) return null;

  const step = availableSteps[stepIndex];
  const isLast = stepIndex === availableSteps.length - 1;
  const tooltip = getTooltipPosition(targetRect);

  return (
    <div className="fixed inset-0 z-[9999]" aria-live="polite">
      <OverlayPieces rect={targetRect} />

      <div
        className="fixed z-[10001] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0b1b33]"
        style={{ width: tooltip.width, left: tooltip.left, top: tooltip.top }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Sparkles size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
                Derkenar Rehberi
              </p>
              <h3 className="mt-0.5 truncate text-base font-semibold text-gray-900 dark:text-white">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => close(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
            aria-label="Turu kapat"
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600 dark:text-slate-300">
            {step.description}
          </p>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / availableSteps.length) * 100}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
            <span>{stepIndex + 1} / {availableSteps.length}</span>
            <button
              type="button"
              onClick={() => close(true)}
              className="font-medium transition hover:text-gray-700 dark:hover:text-slate-200"
            >
              Turu atla
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-5 py-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            <ChevronLeft size={16} />
            Geri
          </button>

          <button
            type="button"
            onClick={() => {
              if (isLast) {
                close(true);
                return;
              }
              setStepIndex((current) => Math.min(current + 1, availableSteps.length - 1));
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {isLast ? 'Turu Tamamla' : 'İleri'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
