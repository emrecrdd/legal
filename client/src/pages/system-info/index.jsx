import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  Headphones,
  Info,
  Mail,
  Phone,
  Server,
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

const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL ||
  'destek@derkenar.com';

const SUPPORT_PHONE =
  import.meta.env.VITE_SUPPORT_PHONE ||
  '+90 5XX XXX XX XX';

const SUPPORT_PHONE_LINK =
  import.meta.env.VITE_SUPPORT_PHONE_LINK ||
  '+905XXXXXXXXX';

const SUPPORT_HOURS =
  import.meta.env.VITE_SUPPORT_HOURS ||
  'Hafta içi 09:00 – 18:00';

const SystemInfo = () => {
  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* PAGE HEADER */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
          <Info size={21} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Sistem Bilgileri
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
            Derkenar ürün, lisans, sistem ve destek bilgilerini görüntüleyin.
          </p>
        </div>
      </div>

      {/* PRODUCT / LICENSE */}
      <Card>
        <Card.Body className="p-0">
          <div className="overflow-hidden rounded-xl">

            <div className="border-b border-gray-100 bg-[#081b3d] px-6 py-6 dark:border-white/[0.06]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">
                  <img
                    src="/favicon.svg"
                    alt="Derkenar"
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

          </div>
        </Card.Body>
      </Card>

      {/* SUPPORT */}
      <Card>
        <Card.Body className="p-0">

          <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-400/[0.08] dark:text-amber-300">
                <Headphones size={19} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Destek ve İletişim
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  Teknik destek ve kullanım desteği için bizimle iletişime geçebilirsiniz.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-3">

            <ContactItem
              icon={Mail}
              label="Destek E-posta"
            >
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="transition-colors hover:text-amber-600 dark:hover:text-amber-300"
              >
                {SUPPORT_EMAIL}
              </a>
            </ContactItem>

            <ContactItem
              icon={Phone}
              label="Destek Hattı"
            >
              <a
                href={`tel:${SUPPORT_PHONE_LINK}`}
                className="transition-colors hover:text-amber-600 dark:hover:text-amber-300"
              >
                {SUPPORT_PHONE}
              </a>
            </ContactItem>

            <ContactItem
              icon={Clock3}
              label="Destek Saatleri"
            >
              {SUPPORT_HOURS}
            </ContactItem>

          </div>

        </Card.Body>
      </Card>

      {/* SYSTEM */}
      <Card>
        <Card.Body className="p-0">

          <div className="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
                <Server size={19} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Sistem
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  Bu Derkenar kurulumuna ait temel sistem bilgileri.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-3">

            <SystemItem
              label="Kurulum"
              value="Kurumsal Büro Kurulumu"
            />

            <SystemItem
              label="Ortam"
              value="Production"
            />

            <SystemItem
              label="Güncellemeler"
              value="Lisans süresince dahil"
            />

          </div>

        </Card.Body>
      </Card>

      {/* LEGAL */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-6 py-5 dark:border-white/[0.06] dark:bg-white/[0.025]">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-slate-400"
          />

          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Lisans ve kullanım
            </p>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500 dark:text-slate-500">
              Derkenar, lisanslı büro tarafından lisans süresi ve kullanım
              koşulları kapsamında kullanılmaktadır. Yazılımın tüm fikri ve
              sınai hakları Derkenar&apos;a aittir.
            </p>

            <p className="mt-3 text-[11px] text-gray-400 dark:text-slate-600">
              © 2026 Derkenar · Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </div>

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

const ContactItem = ({
  icon: Icon,
  label,
  children,
}) => {
  return (
    <div className="flex gap-3 border-b border-gray-100 px-6 py-5 md:border-b-0 md:border-r md:last:border-r-0 dark:border-white/[0.06]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
          {label}
        </p>

        <div className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">
          {children}
        </div>
      </div>
    </div>
  );
};

const SystemItem = ({
  label,
  value,
}) => {
  return (
    <div className="border-b border-gray-100 px-6 py-5 md:border-b-0 md:border-r md:last:border-r-0 dark:border-white/[0.06]">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
};

export default SystemInfo;