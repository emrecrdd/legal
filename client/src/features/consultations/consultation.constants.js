export const CONSULTATION_STATUS_OPTIONS = [
  {
    value: 'new',
    label: 'Yeni Talep',
  },
  {
    value: 'evaluating',
    label: 'Ön Değerlendirme',
  },
  {
    value: 'meeting_scheduled',
    label: 'Görüşme Planlandı',
  },
  {
    value: 'in_progress',
    label: 'Devam Ediyor',
  },
  {
    value: 'waiting_client',
    label: 'Müvekkilden Bekleniyor',
  },
  {
    value: 'completed',
    label: 'Tamamlandı',
  },
  {
    value: 'converted_to_case',
    label: 'Davaya Dönüştü',
  },
  {
    value: 'rejected',
    label: 'Reddedildi',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

export const CONSULTATION_TYPE_OPTIONS = [
  {
    value: 'oral',
    label: 'Sözlü Danışmanlık',
  },
  {
    value: 'written_opinion',
    label: 'Yazılı Hukuki Görüş',
  },
  {
    value: 'contract_review',
    label: 'Sözleşme İnceleme',
  },
  {
    value: 'contract_drafting',
    label: 'Sözleşme Hazırlama',
  },
  {
    value: 'notice_petition',
    label: 'İhtar / İhbar / Dilekçe',
  },
  {
    value: 'corporate',
    label: 'Şirket Danışmanlığı',
  },
  {
    value: 'continuous',
    label: 'Sürekli Hukuki Danışmanlık',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

export const CONSULTATION_MODE_OPTIONS = [
  {
    value: '',
    label: 'Belirtilmedi',
  },
  {
    value: 'office',
    label: 'Ofiste',
  },
  {
    value: 'phone',
    label: 'Telefon',
  },
  {
    value: 'online',
    label: 'Online',
  },
  {
    value: 'on_site',
    label: 'Yerinde',
  },
  {
    value: 'written',
    label: 'Yazılı',
  },
];

export const CONSULTATION_SERVICE_MODEL_OPTIONS = [
  {
    value: 'one_time',
    label: 'Tek Seferlik',
  },
  {
    value: 'ongoing',
    label: 'Sürekli',
  },
];

export const CONSULTATION_PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Düşük',
  },
  {
    value: 'normal',
    label: 'Normal',
  },
  {
    value: 'high',
    label: 'Yüksek',
  },
  {
    value: 'critical',
    label: 'Kritik',
  },
];

export const CONSULTATION_BILLING_TYPE_OPTIONS = [
  {
    value: 'free',
    label: 'Ücretsiz',
  },
  {
    value: 'fixed',
    label: 'Sabit',
  },
  {
    value: 'hourly',
    label: 'Saatlik',
  },
  {
    value: 'retainer',
    label: 'Aylık / Retainer',
  },
];

export const CONSULTATION_SOURCE_OPTIONS = [
  {
    value: '',
    label: 'Belirtilmedi',
  },
  {
    value: 'referral',
    label: 'Referans',
  },
  {
    value: 'web',
    label: 'Web',
  },
  {
    value: 'existing_client',
    label: 'Mevcut Müvekkil',
  },
  {
    value: 'phone',
    label: 'Telefon',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

export const CONSULTATION_CURRENCY_OPTIONS = [
  {
    value: 'TRY',
    label: 'TRY — Türk Lirası',
  },
  {
    value: 'USD',
    label: 'USD — Amerikan Doları',
  },
  {
    value: 'EUR',
    label: 'EUR — Euro',
  },
  {
    value: 'GBP',
    label: 'GBP — İngiliz Sterlini',
  },
];

export const getConsultationStatusLabel = (
  status
) => {
  return (
    CONSULTATION_STATUS_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        status
    )?.label ||
    status ||
    '-'
  );
};

export const getConsultationStatusVariant = (
  status
) => {
  const variants = {
    new:
      'primary',

    evaluating:
      'warning',

    meeting_scheduled:
      'info',

    in_progress:
      'success',

    waiting_client:
      'warning',

    completed:
      'default',

    converted_to_case:
      'success',

    rejected:
      'danger',

    cancelled:
      'danger',
  };

  return (
    variants[
      status
    ] ||
    'default'
  );
};

export const getConsultationPriorityLabel = (
  priority
) => {
  return (
    CONSULTATION_PRIORITY_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        priority
    )?.label ||
    priority ||
    'Normal'
  );
};

export const getConsultationPriorityVariant = (
  priority
) => {
  const variants = {
    low:
      'default',

    normal:
      'primary',

    high:
      'warning',

    critical:
      'danger',
  };

  return (
    variants[
      priority
    ] ||
    'default'
  );
};

export const getConsultationTypeLabel = (
  type
) => {
  return (
    CONSULTATION_TYPE_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        type
    )?.label ||
    type ||
    '-'
  );
};

export const getConsultationServiceModelLabel = (
  serviceModel
) => {
  return (
    CONSULTATION_SERVICE_MODEL_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        serviceModel
    )?.label ||
    serviceModel ||
    '-'
  );
};

export const getConsultationBillingTypeLabel = (
  billingType
) => {
  return (
    CONSULTATION_BILLING_TYPE_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        billingType
    )?.label ||
    billingType ||
    '-'
  );
};

export const getConsultationModeLabel = (
  mode
) => {
  return (
    CONSULTATION_MODE_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        (mode || '')
    )?.label ||
    mode ||
    'Belirtilmedi'
  );
};

export const getConsultationSourceLabel = (
  source
) => {
  return (
    CONSULTATION_SOURCE_OPTIONS.find(
      (
        option
      ) =>
        option.value ===
        (source || '')
    )?.label ||
    source ||
    'Belirtilmedi'
  );
};

export const formatConsultationMoney = (
  amount,
  currency = 'TRY'
) => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ''
  ) {
    return '-';
  }

  const numeric =
    Number(
      amount
    );

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return '-';
  }

  try {
    return new Intl.NumberFormat(
      'tr-TR',
      {
        style:
          'currency',

        currency:
          String(
            currency ||
            'TRY'
          ).toUpperCase(),

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2,
      }
    ).format(
      numeric
    );
  } catch {
    return `${numeric} ${currency || ''}`.trim();
  }
};

