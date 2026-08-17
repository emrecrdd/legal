import {
  useEffect,
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
  useQueryClient,
} from '@tanstack/react-query';

import casePartyApi from '../../features/case-parties/case-party.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';

import {
  ArrowLeft,
  Building2,
  Save,
  Trash2,
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

const CasePartyEdit = () => {
  const {
    id,
    caseId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

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
  // PARTY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useQuery({
      queryKey: [
        'case-party',
        id,
      ],

      queryFn: () =>
        casePartyApi.getOne(
          id
        ),

      enabled:
        Boolean(id),

      staleTime:
        2 * 60 * 1000,
    });

  const party =
    data?.data?.data ??
    data?.data ??
    null;

  useEffect(() => {
    if (
      !party
    ) {
      return;
    }

    setFormData({
      party_type:
        party.party_type ||
        'davali',

      entity_type:
        party.entity_type ||
        'person',

      name:
        party.name ||
        '',

      identification_number:
        party.identification_number ||
        party.tc_number ||
        '',

      tax_office:
        party.tax_office ||
        '',

      phone:
        party.phone ||
        '',

      email:
        party.email ||
        '',

      address:
        party.address ||
        '',

      lawyer_name:
        party.lawyer_name ||
        '',

      lawyer_phone:
        party.lawyer_phone ||
        '',

      lawyer_email:
        party.lawyer_email ||
        '',

      lawyer_registry_number:
        party.lawyer_registry_number ||
        '',

      notes:
        party.notes ||
        '',
    });
  }, [
    party,
  ]);

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
  // UPDATE
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (
        payload
      ) =>
        casePartyApi.update(
          id,
          payload
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            'case-party',
            id,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'case-parties',
            caseId,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'case',
            caseId,
          ],
        });

        toast.success(
          'Taraf başarıyla güncellendi'
        );

        navigate(
          `/cases/${caseId}/parties/${id}`
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
          'Taraf güncellenemedi';

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

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useMutation({
      mutationFn: () =>
        casePartyApi.remove(
          id
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            'case-parties',
            caseId,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'case',
            caseId,
          ],
        });

        toast.success(
          'Taraf silindi'
        );

        navigate(
          `/cases/${caseId}`
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Taraf silinemedi'
        );
      },
    });

  const isPending =
    mutation.isPending ||
    deleteMutation.isPending;

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
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (
        isPending
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `"${party?.name || 'Bu taraf'}" kaydını silmek istediğinize emin misiniz?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      deleteMutation.mutate();
    };

  // ======================================================
  // LOADING / ERROR
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

      </div>
    );
  }

  if (
    error ||
    !party
  ) {
    return (
      <div className="py-16 text-center">

        <Users className="mx-auto h-10 w-10 text-gray-300" />

        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Taraf bulunamadı
        </h2>

        <Link
          to={`/cases/${caseId}`}
          className="mt-4 inline-block"
        >
          <Button variant="outline">
            Davaya Dön
          </Button>
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <div>

        <Link
          to={`/cases/${caseId}/parties/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />

          Tarafa Dön
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

            <Users className="h-6 w-6 text-blue-600" />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tarafı Düzenle
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {party.name} · {selectedPartyTypeLabel}
            </p>

          </div>

        </div>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          <section className="space-y-4">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Taraf Bilgileri
            </h2>

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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {PARTY_TYPES.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

              </div>

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kişi Türü
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
                    className={`rounded-xl border p-3 ${
                      formData.entity_type ===
                      'person'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <UserRound className="h-5 w-5 text-blue-600" />

                    <p className="mt-2 text-sm font-medium">
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
                    className={`rounded-xl border p-3 ${
                      formData.entity_type ===
                      'company'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Building2 className="h-5 w-5 text-blue-600" />

                    <p className="mt-2 text-sm font-medium">
                      Tüzel Kişi
                    </p>
                  </button>

                </div>

              </div>

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

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
                inputMode="numeric"
                disabled={
                  isPending
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
                />
              )}

            </div>

          </section>

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
              />

            </div>

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
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Adres bilgisi..."
            />

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Vekil Bilgileri
            </h2>

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
              />

            </div>

          </section>

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
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />

          </section>

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                mutation.isPending
              }
              disabled={
                isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Değişiklikleri Kaydet
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                isPending
              }
              onClick={() =>
                navigate(
                  `/cases/${caseId}/parties/${id}`
                )
              }
            >
              Vazgeç
            </Button>

            <Button
              type="button"
              variant="danger"
              loading={
                deleteMutation.isPending
              }
              disabled={
                isPending
              }
              onClick={
                handleDelete
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />

              Tarafı Sil
            </Button>

          </div>

        </form>

      </Card>

    </div>
  );
};

export default CasePartyEdit;