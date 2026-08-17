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

import casePartyApi from '../../features/case-parties/case-party.api.js';
import caseApi from '../../features/cases/case.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  Building2,
  Gavel,
  Save,
  Scale,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const PARTY_TYPES = [
  { value: 'davaci', label: 'Davacı' },
  { value: 'davali', label: 'Davalı' },
  { value: 'supheli', label: 'Şüpheli' },
  { value: 'sanik', label: 'Sanık' },
  { value: 'musteki', label: 'Müşteki' },
  { value: 'katilan', label: 'Katılan' },
  { value: 'magdur', label: 'Mağdur' },
  { value: 'maktul', label: 'Maktul' },
  { value: 'alacakli', label: 'Alacaklı' },
  { value: 'borclu', label: 'Borçlu' },
  { value: 'ucuncu_kisi', label: 'Üçüncü Kişi' },
];

const INITIAL_FORM = {
  party_type: 'davali',
  entity_type: 'person',

  name: '',
  identification_number: '',
  tax_office: '',

  phone: '',
  email: '',
  address: '',

  lawyer_name: '',
  lawyer_phone: '',
  lawyer_email: '',
  lawyer_registry_number: '',

  notes: '',
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
  // CASE
  // ======================================================

  const {
    data:
      caseData,

    isLoading:
      caseLoading,
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
        5 * 60 * 1000,
    });

  const caseItem =
    caseData?.data?.data ||
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
          response?.data?.data ??
          response?.data ??
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
        const message =
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Taraf eklenemedi';

        toast.error(
          message
        );

        if (
          /kimlik|vergi|identification/i.test(
            message
          )
        ) {
          setErrors(
            (
              current
            ) => ({
              ...current,

              identification_number:
                message,
            })
          );
        }
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
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const name =
        formData.name.trim();

      const identity =
        onlyDigits(
          formData.identification_number
        );

      if (
        name.length <
        2
      ) {
        nextErrors.name =
          isCompany
            ? 'Kurum / şirket unvanı gereklidir'
            : 'Ad soyad gereklidir';
      }

      if (
        identity
      ) {
        if (
          !isCompany &&
          identity.length !==
            11
        ) {
          nextErrors.identification_number =
            'T.C. Kimlik No 11 haneli olmalıdır';
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

      if (
        formData.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          formData.email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi girin';
      }

      if (
        formData.lawyer_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          formData.lawyer_email
        )
      ) {
        nextErrors.lawyer_email =
          'Geçerli bir avukat e-posta adresi girin';
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
          formData.identification_number
        ),

      tax_office:
        isCompany
          ? normalizeNullable(
              formData.tax_office
            )
          : null,

      phone:
        normalizeNullable(
          formData.phone
        ),

      email:
        normalizeNullable(
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
          formData.lawyer_phone
        ),

      lawyer_email:
        normalizeNullable(
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
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/cases/${caseId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />

          Davaya Dön
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

            <Users className="h-6 w-6 text-blue-600" />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Yeni Taraf Ekle
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Davacı, davalı, şüpheli, sanık veya diğer dava taraflarının kimlik ve vekil bilgilerini kaydedin.
            </p>

          </div>

        </div>

      </div>

      {/* CASE SUMMARY */}

      <Card>

        <Card.Body>

          {caseLoading ? (
            <p className="text-sm text-gray-500">
              Dava bilgileri yükleniyor...
            </p>
          ) : caseItem ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-3">

                <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">

                  <Scale className="h-5 w-5 text-gray-600 dark:text-gray-300" />

                </div>

                <div>

                  <p className="font-semibold text-gray-900 dark:text-white">
                    {caseItem.title}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {caseItem.case_number ||
                      'Dosya numarası yok'}

                    {caseItem.court_name
                      ? ` · ${caseItem.court_name}`
                      : ''}
                  </p>

                </div>

              </div>

              <Badge variant="default">
                {selectedPartyTypeLabel}
              </Badge>

            </div>
          ) : (
            <p className="text-sm text-red-600">
              Dava bilgisi yüklenemedi.
            </p>
          )}

        </Card.Body>

      </Card>

      {/* FORM */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          {/* PARTY CLASSIFICATION */}

          <section className="space-y-4">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Taraf Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Tarafın dosyadaki hukuki rolünü ve kişi türünü belirleyin.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kişi Türü *
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          entity_type:
                            'person',

                          identification_number:
                            '',

                          tax_office:
                            '',
                        })
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      formData.entity_type ===
                      'person'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <UserRound className="h-5 w-5 text-blue-600" />

                    <p className="mt-2 font-medium text-gray-900 dark:text-white">
                      Gerçek Kişi
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          entity_type:
                            'company',

                          identification_number:
                            '',
                        })
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      formData.entity_type ===
                      'company'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Building2 className="h-5 w-5 text-blue-600" />

                    <p className="mt-2 font-medium text-gray-900 dark:text-white">
                      Tüzel Kişi
                    </p>
                  </button>

                </div>

              </div>

            </div>

          </section>

          {/* IDENTITY */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">

              <Gavel className="h-5 w-5 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Kimlik / Kurum Bilgileri
              </h2>

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
              placeholder={
                isCompany
                  ? 'Örn: ABC İnşaat A.Ş.'
                  : 'Örn: Ahmet Yılmaz'
              }
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
                  disabled={
                    isPending
                  }
                  placeholder="Örn: Büyük Mükellefler"
                />
              )}

            </div>

          </section>

          {/* CONTACT */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              İletişim Bilgileri
            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Telefon"
                name="phone"
                value={
                  formData.phone
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
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
                placeholder="ornek@email.com"
              />

            </div>

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                rows="3"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Adres bilgisi..."
              />

            </div>

          </section>

          {/* LAWYER */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Vekil Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Tarafın avukatı varsa iletişim ve baro sicil bilgilerini kaydedin.
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
              disabled={
                isPending
              }
              placeholder="Örn: Av. Ahmet Yılmaz"
            />

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Telefon"
                name="lawyer_phone"
                value={
                  formData.lawyer_phone
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
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
                disabled={
                  isPending
                }
                placeholder="123456"
              />

            </div>

          </section>

          {/* NOTES */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              İç Not
            </h2>

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
              rows="3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Tarafla ilgili büro içi not..."
            />

          </section>

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                isPending
              }
              disabled={
                isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Tarafı Kaydet
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                isPending
              }
              onClick={() =>
                navigate(
                  `/cases/${caseId}`
                )
              }
            >
              Vazgeç
            </Button>

          </div>

        </form>

      </Card>

    </div>
  );
};

export default CasePartyCreate;