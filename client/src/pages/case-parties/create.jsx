import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import casePartyApi
  from '../../features/case-parties/case-party.api.js';

import caseApi
  from '../../features/cases/case.api.js';

import Button
  from '../../components/ui/Button.jsx';

import Input
  from '../../components/ui/Input.jsx';

import Card
  from '../../components/ui/Card.jsx';

import Badge
  from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  Building2,
  Gavel,
  Save,
  Scale,
  UserRound,
  Users,
} from 'lucide-react';

import toast
  from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const PARTY_TYPES = [
  {
    value: 'davaci',
    label: 'Davacı',
  },
  {
    value: 'davali',
    label: 'Davalı',
  },
  {
    value: 'supheli',
    label: 'Şüpheli',
  },
  {
    value: 'sanik',
    label: 'Sanık',
  },
  {
    value: 'musteki',
    label: 'Müşteki',
  },
  {
    value: 'katilan',
    label: 'Katılan',
  },
  {
    value: 'magdur',
    label: 'Mağdur',
  },
  {
    value: 'maktul',
    label: 'Maktul',
  },
  {
    value: 'alacakli',
    label: 'Alacaklı',
  },
  {
    value: 'borclu',
    label: 'Borçlu',
  },
  {
    value: 'ucuncu_kisi',
    label: 'Üçüncü Kişi',
  },
];

const INITIAL_FORM = {
  party_type:
    'davali',

  entity_type:
    'person',

  name:
    '',

  identification_number:
    '',

  tax_office:
    '',

  phone:
    '',

  email:
    '',

  address:
    '',

  lawyer_name:
    '',

  lawyer_phone:
    '',

  lawyer_email:
    '',

  lawyer_registry_number:
    '',

  notes:
    '',
};

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ?? ''
    ).trim();

  return (
    normalized ||
    null
  );
};

const normalizeEmail = (
  value
) => {
  const normalized =
    String(
      value || ''
    )
      .trim()
      .toLowerCase();

  return (
    normalized ||
    null
  );
};

const onlyDigits = (
  value
) => {
  return String(
    value || ''
  ).replace(
    /\D/g,
    ''
  );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  )
    .replace(
      /[^\d+\s()-]/g,
      ''
    )
    .slice(
      0,
      25
    );
};

const validateEmail = (
  value
) => {
  if (
    !value
  ) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};

const validatePhone = (
  value
) => {
  if (
    !value
  ) {
    return true;
  }

  const digits =
    String(
      value
    ).replace(
      /\D/g,
      ''
    );

  return (
    digits.length >= 10 &&
    digits.length <= 15
  );
};
const isValidTCKN = (
  value
) => {
  const tckn =
    String(
      value || ''
    ).trim();

  // 11 hane ve ilk rakam 0 olamaz
  if (
    !/^[1-9]\d{10}$/.test(
      tckn
    )
  ) {
    return false;
  }

  const digits =
    tckn
      .split('')
      .map(Number);

  // Son rakam çift olmalı
  if (
    digits[10] % 2 !==
    0
  ) {
    return false;
  }

  const oddSum =
    digits[0] +
    digits[2] +
    digits[4] +
    digits[6] +
    digits[8];

  const evenSum =
    digits[1] +
    digits[3] +
    digits[5] +
    digits[7];

  // 10. basamak
  const digit10 =
    (
      (
        oddSum * 7
      ) -
      evenSum
    ) % 10;

  if (
    digit10 !==
    digits[9]
  ) {
    return false;
  }

  // 11. basamak
  const digit11 =
    digits
      .slice(
        0,
        10
      )
      .reduce(
        (
          sum,
          digit
        ) =>
          sum + digit,
        0
      ) % 10;

  return (
    digit11 ===
    digits[10]
  );
};

const normalizeFormForComparison = (
  form
) => ({
  party_type:
    form.party_type,

  entity_type:
    form.entity_type,

  name:
    String(
      form.name || ''
    ).trim(),

  identification_number:
    onlyDigits(
      form.identification_number
    ),

  tax_office:
    String(
      form.tax_office || ''
    ).trim(),

  phone:
    normalizePhone(
      form.phone
    ).trim(),

  email:
    String(
      form.email || ''
    )
      .trim()
      .toLowerCase(),

  address:
    String(
      form.address || ''
    ).trim(),

  lawyer_name:
    String(
      form.lawyer_name || ''
    ).trim(),

  lawyer_phone:
    normalizePhone(
      form.lawyer_phone
    ).trim(),

  lawyer_email:
    String(
      form.lawyer_email || ''
    )
      .trim()
      .toLowerCase(),

  lawyer_registry_number:
    String(
      form.lawyer_registry_number || ''
    ).trim(),

  notes:
    String(
      form.notes || ''
    ).trim(),
});

// ======================================================
// COMPONENT
// ======================================================

const CasePartyCreate = () => {
  const {
    caseId,
  } =
    useParams();

  const navigate =
    useNavigate();

  // ======================================================
  // STATE
  // ======================================================

  const [
    formData,
    setFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});

  // ======================================================
  // CASE QUERY
  // ======================================================

  const {
    data:
      caseData,

    isLoading:
      caseLoading,

    error:
      caseError,
  } =
    useQuery({
      queryKey: [
        'case',
        'party-create',
        caseId,
      ],

      queryFn: () =>
        caseApi.getOne(
          caseId
        ),

      enabled:
        Boolean(
          caseId
        ),

      staleTime:
        5 *
        60 *
        1000,
    });

  const caseItem =
    caseData
      ?.data
      ?.data ||
    null;

  // ======================================================
  // DERIVED
  // ======================================================

  const isCompany =
    formData.entity_type ===
    'company';

  const identityLabel =
    isCompany
      ? 'Vergi Kimlik No'
      : 'T.C. Kimlik No';

  const identityPlaceholder =
    isCompany
      ? '10 haneli VKN'
      : '11 haneli TCKN';

  const selectedPartyTypeLabel =
    useMemo(() => {
      return (
        PARTY_TYPES.find(
          (
            item
          ) =>
            item.value ===
            formData.party_type
        )?.label ||
        formData.party_type
      );
    }, [
      formData.party_type,
    ]);

  const isDirty =
    useMemo(() => {
      const current =
        normalizeFormForComparison(
          formData
        );

      const initial =
        normalizeFormForComparison(
          INITIAL_FORM
        );

      return (
        JSON.stringify(
          current
        ) !==
        JSON.stringify(
          initial
        )
      );
    }, [
      formData,
    ]);

  // ======================================================
  // MUTATION
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (
        payload
      ) =>
        casePartyApi.create(
          caseId,
          payload
        ),

      onSuccess: (
        response
      ) => {
        toast.success(
          'Taraf başarıyla eklendi'
        );

        const party =
          response
            ?.data
            ?.data ??
          response
            ?.data ??
          null;

        if (
          party?.id
        ) {
          navigate(
            `/cases/${caseId}/parties/${party.id}`
          );

          return;
        }

        navigate(
          `/cases/${caseId}`
        );
      },

      onError: (
        error
      ) => {
        const backendErrors =
          error
            ?.response
            ?.data
            ?.errors;

        const message =
          error
            ?.response
            ?.data
            ?.message ||
          error
            ?.message ||
          'Taraf eklenemedi';

        const nextErrors =
          {};

        if (
          Array.isArray(
            backendErrors
          )
        ) {
          backendErrors.forEach(
            (
              item
            ) => {
              const field =
                item?.path ||
                item?.param;

              if (
                field
              ) {
                nextErrors[field] =
                  item?.msg ||
                  'Geçersiz değer';
              }
            }
          );
        }

        if (
          /kimlik|tckn|tckno|identification/i.test(
            message
          )
        ) {
          nextErrors.identification_number =
            message;
        }

        if (
          /vergi|vkn/i.test(
            message
          )
        ) {
          nextErrors.identification_number =
            message;
        }

        if (
          /ad soyad|unvan|name/i.test(
            message
          )
        ) {
          nextErrors.name =
            message;
        }

        if (
          /avukat.*e-posta|lawyer_email/i.test(
            message
          )
        ) {
          nextErrors.lawyer_email =
            message;
        } else if (
          /e-posta|email/i.test(
            message
          )
        ) {
          nextErrors.email =
            message;
        }

        if (
          /avukat.*telefon|lawyer_phone/i.test(
            message
          )
        ) {
          nextErrors.lawyer_phone =
            message;
        } else if (
          /telefon|phone/i.test(
            message
          )
        ) {
          nextErrors.phone =
            message;
        }

        if (
          Object.keys(
            nextErrors
          ).length >
          0
        ) {
          setErrors(
            (
              current
            ) => ({
              ...current,
              ...nextErrors,
            })
          );

          toast.error(
            'Formdaki hatalı alanları kontrol edin'
          );

          return;
        }

        toast.error(
          message
        );
      },
    });

  const isPending =
    mutation.isPending;

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    let nextValue =
      value;

    if (
      name ===
      'identification_number'
    ) {
      nextValue =
        onlyDigits(
          value
        ).slice(
          0,
          isCompany
            ? 10
            : 11
        );
    }

    if (
      name ===
      'phone' ||
      name ===
      'lawyer_phone'
    ) {
      nextValue =
        normalizePhone(
          value
        );
    }

    if (
      name ===
      'name'
    ) {
      nextValue =
        value.slice(
          0,
          255
        );
    }

    if (
      name ===
      'tax_office'
    ) {
      nextValue =
        value.slice(
          0,
          150
        );
    }

    if (
      name ===
      'email' ||
      name ===
      'lawyer_email'
    ) {
      nextValue =
        value.slice(
          0,
          254
        );
    }

    if (
      name ===
      'address'
    ) {
      nextValue =
        value.slice(
          0,
          1000
        );
    }

    if (
      name ===
      'lawyer_name'
    ) {
      nextValue =
        value.slice(
          0,
          255
        );
    }

    if (
      name ===
      'lawyer_registry_number'
    ) {
      nextValue =
        value.slice(
          0,
          100
        );
    }

    if (
      name ===
      'notes'
    ) {
      nextValue =
        value.slice(
          0,
          3000
        );
    }

    setFormData(
      (
        current
      ) => ({
        ...current,

        [name]:
          nextValue,

        ...(name ===
        'entity_type'
          ? {
              identification_number:
                '',

              tax_office:
                value ===
                'company'
                  ? current.tax_office
                  : '',
            }
          : {}),
      })
    );

    if (
      errors[name]
    ) {
      setErrors(
        (
          current
        ) => ({
          ...current,

          [name]:
            '',
        })
      );
    }
  };

  // ======================================================
  // ENTITY TYPE
  // ======================================================

  const handleEntityTypeChange =
    (
      type
    ) => {
      if (
        isPending
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          entity_type:
            type,

          identification_number:
            '',

          tax_office:
            type ===
            'company'
              ? current.tax_office
              : '',
        })
      );

      setErrors(
        (
          current
        ) => ({
          ...current,

          identification_number:
            '',

          tax_office:
            '',
        })
      );
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const name =
        String(
          formData.name ||
          ''
        ).trim();

      const identity =
        onlyDigits(
          formData.identification_number
        );

      const email =
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase();

      const lawyerEmail =
        String(
          formData.lawyer_email ||
          ''
        )
          .trim()
          .toLowerCase();

      // ==================================================
      // NAME
      // ==================================================

      if (
        !name
      ) {
        nextErrors.name =
          isCompany
            ? 'Kurum / şirket unvanı gereklidir'
            : 'Ad soyad gereklidir';
      } else if (
        name.length <
        2
      ) {
        nextErrors.name =
          isCompany
            ? 'Kurum / şirket unvanı en az 2 karakter olmalıdır'
            : 'Ad soyad en az 2 karakter olmalıdır';
      } else if (
        name.length >
        255
      ) {
        nextErrors.name =
          'Ad / unvan en fazla 255 karakter olabilir';
      }

      // ==================================================
      // IDENTIFICATION
      // ==================================================

     if (
  identity
) {
  if (
    !isCompany
  ) {
    if (
      identity.length !==
      11
    ) {
      nextErrors.identification_number =
        'T.C. Kimlik No 11 haneli olmalıdır';
    } else if (
      identity.startsWith(
        '0'
      )
    ) {
      nextErrors.identification_number =
        'T.C. Kimlik No 0 ile başlayamaz';
    } else if (
      Number(
        identity[10]
      ) %
        2 !==
      0
    ) {
      nextErrors.identification_number =
        'T.C. Kimlik No son hanesi çift olmalıdır';
    } else if (
      !isValidTCKN(
        identity
      )
    ) {
      nextErrors.identification_number =
        'Geçerli bir T.C. Kimlik No giriniz';
    }
  }

  if (
    isCompany &&
    identity.length !==
      10
  ) {
    nextErrors.identification_number =
      'Vergi Kimlik No 10 haneli olmalıdır';
  }
}

      // ==================================================
      // TAX OFFICE
      // ==================================================

      if (
        isCompany &&
        formData.tax_office
          .trim()
          .length >
        150
      ) {
        nextErrors.tax_office =
          'Vergi dairesi en fazla 150 karakter olabilir';
      }

      // ==================================================
      // PHONE
      // ==================================================

      if (
        !validatePhone(
          formData.phone
        )
      ) {
        nextErrors.phone =
          'Geçerli bir telefon numarası girin';
      }

      // ==================================================
      // EMAIL
      // ==================================================

      if (
        !validateEmail(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi girin';
      }

      // ==================================================
      // ADDRESS
      // ==================================================

      if (
        formData.address.length >
        1000
      ) {
        nextErrors.address =
          'Adres en fazla 1000 karakter olabilir';
      }

      // ==================================================
      // LAWYER
      // ==================================================

      if (
        formData.lawyer_name
          .trim()
          .length >
        255
      ) {
        nextErrors.lawyer_name =
          'Avukat adı en fazla 255 karakter olabilir';
      }

      if (
        !validatePhone(
          formData.lawyer_phone
        )
      ) {
        nextErrors.lawyer_phone =
          'Geçerli bir avukat telefon numarası girin';
      }

      if (
        !validateEmail(
          lawyerEmail
        )
      ) {
        nextErrors.lawyer_email =
          'Geçerli bir avukat e-posta adresi girin';
      }

      if (
        formData
          .lawyer_registry_number
          .trim()
          .length >
        100
      ) {
        nextErrors.lawyer_registry_number =
          'Baro sicil numarası en fazla 100 karakter olabilir';
      }

      // ==================================================
      // NOTES
      // ==================================================

      if (
        formData.notes.length >
        3000
      ) {
        nextErrors.notes =
          'İç not en fazla 3000 karakter olabilir';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      isPending
    ) {
      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const payload = {
      case_id:
        caseId,

      party_type:
        formData.party_type,

      entity_type:
        formData.entity_type,

      name:
        formData.name.trim(),

      identification_number:
        normalizeNullable(
          onlyDigits(
            formData.identification_number
          )
        ),

      tax_office:
        isCompany
          ? normalizeNullable(
              formData.tax_office
            )
          : null,

      phone:
        normalizeNullable(
          normalizePhone(
            formData.phone
          )
        ),

      email:
        normalizeEmail(
          formData.email
        ),

      address:
        normalizeNullable(
          formData.address
        ),

      lawyer_name:
        normalizeNullable(
          formData.lawyer_name
        ),

      lawyer_phone:
        normalizeNullable(
          normalizePhone(
            formData.lawyer_phone
          )
        ),

      lawyer_email:
        normalizeEmail(
          formData.lawyer_email
        ),

      lawyer_registry_number:
        normalizeNullable(
          formData.lawyer_registry_number
        ),

      notes:
        normalizeNullable(
          formData.notes
        ),
    };

    mutation.mutate(
      payload
    );
  };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      if (
        isPending
      ) {
        return;
      }

      if (
        isDirty
      ) {
        const confirmed =
          window.confirm(
            'Kaydedilmemiş taraf bilgileri var. Sayfadan ayrılmak istediğinize emin misiniz?'
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      navigate(
        `/cases/${caseId}`
      );
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to={`/cases/${caseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />

          Davaya Dön
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <Users size={21} />
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
                Yeni Taraf Ekle
              </h1>

              {isDirty && (
                <Badge
                  variant="warning"
                >
                  Kaydedilmemiş bilgi
                </Badge>
              )}

            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Davacı, davalı, şüpheli, sanık veya diğer dava taraflarının kimlik, iletişim ve vekil bilgilerini kaydedin.
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          CASE SUMMARY
      ================================================== */}

      <Card>

        <Card.Body>

          {caseLoading ? (
            <div className="flex items-center gap-3">

              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-b-blue-600" />

              <p className="text-sm text-gray-500 dark:text-slate-400">
                Dava bilgileri yükleniyor...
              </p>

            </div>
          ) : caseError ? (
            <div>

              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Dava bilgileri yüklenemedi
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                {caseError
                  ?.response
                  ?.data
                  ?.message ||
                  caseError
                    ?.message ||
                  'Dava kaydına erişilemedi.'}
              </p>

            </div>
          ) : caseItem ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex min-w-0 items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-slate-300">
                  <Scale className="h-5 w-5" />
                </div>

                <div className="min-w-0">

                  <p className="truncate font-semibold text-gray-900 dark:text-white">
                    {caseItem.title ||
                      caseItem.judiciary_type ||
                      'Dava Dosyası'}
                  </p>

                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    {caseItem.case_number ||
                      'Dosya numarası belirtilmemiş'}

                    {caseItem.court_name
                      ? ` · ${caseItem.court_name}`
                      : ''}
                  </p>

                </div>

              </div>

              <Badge
                variant="primary"
              >
                {selectedPartyTypeLabel}
              </Badge>

            </div>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              Dava bilgisi bulunamadı.
            </p>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          FORM
      ================================================== */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          {/* ==================================================
              PARTY CLASSIFICATION
          ================================================== */}

          <section className="space-y-4">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Taraf Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Tarafın dosyadaki hukuki rolünü ve kişi türünü belirleyin.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* PARTY TYPE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Taraf Türü *
                </label>

                <select
                  name="party_type"
                  value={
                    formData.party_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >

                  {PARTY_TYPES.map(
                    (
                      type
                    ) => (
                      <option
                        key={
                          type.value
                        }
                        value={
                          type.value
                        }
                      >
                        {type.label}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* ENTITY TYPE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Kişi Türü *
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      handleEntityTypeChange(
                        'person'
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      !isCompany
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/[0.08]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08]'
                    }`}
                  >

                    <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Gerçek Kişi
                    </p>

                    <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500">
                      T.C. kimlik bilgileri
                    </p>

                  </button>

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      handleEntityTypeChange(
                        'company'
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isCompany
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/[0.08]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-white/[0.08]'
                    }`}
                  >

                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                    <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Tüzel Kişi
                    </p>

                    <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500">
                      Şirket veya kurum
                    </p>

                  </button>

                </div>

              </div>

            </div>

          </section>

          {/* ==================================================
              IDENTITY
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <div className="flex items-center gap-2">

              <Gavel className="h-5 w-5 text-blue-600 dark:text-blue-400" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Kimlik / Kurum Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                  Tarafın temel kimlik veya kurum bilgilerini girin.
                </p>

              </div>

            </div>

            <Input
              label={
                isCompany
                  ? 'Unvan *'
                  : 'Ad Soyad *'
              }
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              error={
                errors.name
              }
              disabled={
                isPending
              }
              maxLength={255}
              placeholder={
                isCompany
                  ? 'Örn: ABC İnşaat A.Ş.'
                  : 'Örn: Ahmet Yılmaz'
              }
              autoFocus
            />

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label={
                  identityLabel
                }
                name="identification_number"
                value={
                  formData.identification_number
                }
                onChange={
                  handleChange
                }
                error={
                  errors.identification_number
                }
                disabled={
                  isPending
                }
                inputMode="numeric"
                maxLength={
                  isCompany
                    ? 10
                    : 11
                }
                placeholder={
                  identityPlaceholder
                }
              />

              {isCompany && (
                <Input
                  label="Vergi Dairesi"
                  name="tax_office"
                  value={
                    formData.tax_office
                  }
                  onChange={
                    handleChange
                  }
                  error={
                    errors.tax_office
                  }
                  disabled={
                    isPending
                  }
                  maxLength={150}
                  placeholder="Örn: Büyük Mükellefler"
                />
              )}

            </div>

            <p className="text-xs text-gray-400 dark:text-slate-600">
  {isCompany
    ? 'VKN girilecekse 10 haneli olmalıdır.'
    : 'TCKN 11 haneli olmalı, 0 ile başlamamalı ve geçerli TCKN algoritmasından geçmelidir.'}
</p>

          </section>

          {/* ==================================================
              CONTACT
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                İletişim Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Tarafın bilinen iletişim ve adres bilgilerini ekleyin.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Telefon"
                name="phone"
                type="tel"
                value={
                  formData.phone
                }
                onChange={
                  handleChange
                }
                error={
                  errors.phone
                }
                disabled={
                  isPending
                }
                maxLength={25}
                placeholder="+90 555 123 45 67"
              />

              <Input
                label="E-posta"
                name="email"
                type="email"
                value={
                  formData.email
                }
                onChange={
                  handleChange
                }
                error={
                  errors.email
                }
                disabled={
                  isPending
                }
                maxLength={254}
                placeholder="ornek@email.com"
              />

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Adres
              </label>

              <textarea
                name="address"
                value={
                  formData.address
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                rows={4}
                maxLength={1000}
                placeholder="Tarafın bilinen adres bilgisi..."
                className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-500 ${
                  errors.address
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              />

              <div className="mt-1 flex justify-between gap-3">

                {errors.address ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.address}
                  </p>
                ) : (
                  <span />
                )}

                <p className="text-[11px] text-gray-400 dark:text-slate-600">
                  {formData.address.length}/1000
                </p>

              </div>

            </div>

          </section>

          {/* ==================================================
              LAWYER
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Vekil Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Tarafın avukatı varsa ad, iletişim ve baro sicil bilgilerini kaydedin.
              </p>

            </div>

            <Input
              label="Avukat Adı"
              name="lawyer_name"
              value={
                formData.lawyer_name
              }
              onChange={
                handleChange
              }
              error={
                errors.lawyer_name
              }
              disabled={
                isPending
              }
              maxLength={255}
              placeholder="Örn: Av. Ahmet Yılmaz"
            />

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Telefon"
                name="lawyer_phone"
                type="tel"
                value={
                  formData.lawyer_phone
                }
                onChange={
                  handleChange
                }
                error={
                  errors.lawyer_phone
                }
                disabled={
                  isPending
                }
                maxLength={25}
                placeholder="+90 555 000 00 00"
              />

              <Input
                label="E-posta"
                name="lawyer_email"
                type="email"
                value={
                  formData.lawyer_email
                }
                onChange={
                  handleChange
                }
                error={
                  errors.lawyer_email
                }
                disabled={
                  isPending
                }
                maxLength={254}
                placeholder="avukat@baro.com"
              />

              <Input
                label="Baro Sicil No"
                name="lawyer_registry_number"
                value={
                  formData.lawyer_registry_number
                }
                onChange={
                  handleChange
                }
                error={
                  errors.lawyer_registry_number
                }
                disabled={
                  isPending
                }
                maxLength={100}
                placeholder="123456"
              />

            </div>

          </section>

          {/* ==================================================
              NOTES
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-white/[0.07]">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                İç Not
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                Sadece büro içinde kullanılacak yardımcı bilgileri ekleyin.
              </p>

            </div>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              disabled={
                isPending
              }
              rows={4}
              maxLength={3000}
              placeholder="Tarafla ilgili büro içi not..."
              className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-500 ${
                errors.notes
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
              }`}
            />

            <div className="flex justify-between gap-3">

              {errors.notes ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.notes}
                </p>
              ) : (
                <span />
              )}

              <p className="text-[11px] text-gray-400 dark:text-slate-600">
                {formData.notes.length}/3000
              </p>

            </div>

          </section>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/[0.07] dark:bg-white/[0.015] sm:grid-cols-3">

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Taraf
              </p>

              <div className="mt-1">

                <Badge
                  variant="primary"
                >
                  {selectedPartyTypeLabel}
                </Badge>

              </div>

            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Tür
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                {isCompany
                  ? 'Tüzel Kişi'
                  : 'Gerçek Kişi'}
              </p>

            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
                Kayıt
              </p>

              <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-slate-300">
                {formData.name.trim() ||
                  'Henüz ad / unvan girilmedi'}
              </p>

            </div>

          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-end">

            <Button
              type="button"
              variant="secondary"
              disabled={
                isPending
              }
              onClick={
                handleCancel
              }
            >
              Vazgeç
            </Button>

            <Button
              type="submit"
              loading={
                isPending
              }
              disabled={
                isPending ||
                caseLoading ||
                !caseItem
              }
            >
              <Save className="h-4 w-4" />

              Tarafı Kaydet
            </Button>

          </div>

        </form>

      </Card>

    </div>
  );
};

export default CasePartyCreate;