import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Info,
  ShieldCheck,
} from 'lucide-react';

import Card from '../../components/ui/Card.jsx';

const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  '1.0.0';

const OFFICE_NAME =
  import.meta.env.VITE_OFFICE_NAME ||
  'Derkenar Demo Hukuk Bürosu';

const LICENSE_TYPE =
  import.meta.env.VITE_LICENSE_TYPE ||
  'Yıllık Kurumsal Lisans';

const SystemInfo = () => {
  return (
    <div className="mx-auto max-w-5xl space-y-6">

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
          <Info size={21} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Sistem Bilgileri
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
            Derkenar ürün, sürüm ve lisans bilgilerini görüntüleyin.
          </p>
        </div>
      </div>

      <Card>
        <Card.Body className="p-0">
          <div className="overflow-hidden rounded-xl">

            <div className="border-b border-gray-100 bg-[#081b3d] px-6 py-6 dark:border-white/[0.06]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="h-14 w-14 shrink-0"
                  />

                  <div>
                    <p className="text-xl font-bold uppercase tracking-[0.08em] text-white">
                      Derkenar
                    </p>

                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
                      Hukuk Büro Yönetim Sistemi
                    </p>
                  </div>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <BadgeCheck size={15} />
                  Lisans Aktif
                </div>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <InfoItem
                icon={Info}
                label="Ürün"
                value="Derkenar"
              />

              <InfoItem
                icon={ShieldCheck}
                label="Sürüm"
                value={`v${APP_VERSION}`}
              />

              <InfoItem
                icon={Building2}
                label="Lisanslı Büro"
                value={OFFICE_NAME}
              />

              <InfoItem
                icon={CalendarDays}
                label="Lisans Türü"
                value={LICENSE_TYPE}
              />
            </div>

            <div className="border-t border-gray-100 px-6 py-4 dark:border-white/[0.06]">
              <p className="text-xs leading-5 text-gray-400 dark:text-slate-500">
                © 2026 Derkenar · Hukuk Büro Yönetim Sistemi
              </p>
            </div>

          </div>
        </Card.Body>
      </Card>

    </div>
  );
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="flex gap-3 border-b border-gray-100 px-6 py-5 last:border-b-0 md:[&:nth-child(odd)]:border-r dark:border-white/[0.06]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
};

export default SystemInfo;
