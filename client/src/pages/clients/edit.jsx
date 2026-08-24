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
  useClient,
  useDeleteClient,
  useUpdateClient,
} from '../../features/clients/client.query.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  name: '',
  identification_number: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  district: '',
  postal_code: '',
  notes: '',
  tags: '',
  client_type: 'individual',
  status: 'active',
};

// ======================================================
// HELPERS
// ======================================================

const normalizeTags = (
  value
) => {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      String(value)
        .split(',')
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean)
    ),
  ];
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  )
    .replace(/[^\d+]/g, '')
    .trim();
};

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ?? ''
    ).trim();

  return normalized || null;
};

const validateEmail = (
  value
) => {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};

const isValidTCKN = (
  value
) => {
  const tckn =
    String(
      value || ''
    ).trim();

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

const formFromClient = (
  client
) => ({
  name:
    client?.name || '',

  identification_number:
    client?.identification_number || '',

  email:
    client?.email || '',

  phone:
    client?.phone || '',

  address:
    client?.address || '',

  city:
    client?.city || '',

  district:
    client?.district || '',

  postal_code:
    client?.postal_code || '',

  notes:
    client?.notes || '',

  tags:
    Array.isArray(
      client?.tags
    )
      ? client.tags.join(
          ', '
        )
      : '',

  client_type:
    client?.client_type ||
    'individual',

  status:
    client?.status ||
    'active',
});

const normalizeFormForComparison = (
  form
) => ({
  name:
    form.name.trim(),

  identification_number:
    normalizeNullable(
      String(
        form.identification_number ||
        ''
      ).replace(
        /\D/g,
        ''
      )
    ),

  email:
    normalizeNullable(
      String(
        form.email ||
        ''
      )
        .trim()
        .toLowerCase()
    ),

  phone:
    normalizeNullable(
      normalizePhone(
        form.phone
      )
    ),

  address:
    normalizeNullable(
      form.address
    ),

  city:
    normalizeNullable(
      form.city
    ),

  district:
    normalizeNullable(
      form.district
    ),

  postal_code:
    normalizeNullable(
      String(
        form.postal_code ||
        ''
      ).replace(
        /\D/g,
        ''
      )
    ),

  notes:
    normalizeNullable(
      form.notes
    ),

  tags:
    normalizeTags(
      form.tags
    ),

  client_type:
    form.client_type,

  status:
    form.status,
});

// ======================================================
// COMPONENT
// ======================================================

const ClientEdit = () => {
  const {
    id,
  } =
    useParams();

  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useClient(
      id
    );

  const updateMutation =
    useUpdateClient();

  const deleteMutation =
    useDeleteClient();

  // ======================================================
  // STATE
  // ======================================================

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    initialFormData,
    setInitialFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    errors,
    setErrors,
  ] = useState({});

  // ======================================================
  // DATA
  // ======================================================

  const client =
    data?.data?.data ??
    data?.data ??
    null;

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_CLIENTS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_CLIENTS
    );

  const isPending =
    updateMutation.isPending ||
    deleteMutation.isPending;

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    if (!client) {
      return;
    }

    const nextForm =
      formFromClient(
        client
      );

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setErrors({});
  }, [
    client,
  ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const isCorporate =
    formData.client_type ===
    'corporate';

  const tagsPreview =
    useMemo(() => {
      return normalizeTags(
        formData.tags
      );
    }, [
      formData.tags,
    ]);

  const normalizedPayload =
    useMemo(() => {
      return normalizeFormForComparison(
        formData
      );
    }, [
      formData,
    ]);

  const initialNormalizedPayload =
    useMemo(() => {
      return normalizeFormForComparison(
        initialFormData
      );
    }, [
      initialFormData,
    ]);

  const isDirty =
    useMemo(() => {
      return (
        JSON.stringify(
          normalizedPayload
        ) !==
        JSON.stringify(
          initialNormalizedPayload
        )
      );
    }, [
      normalizedPayload,
      initialNormalizedPayload,
    ]);

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
        value.replace(
          /\D/g,
          ''
        );

      nextValue =
        isCorporate
          ? nextValue.slice(
              0,
              10
            )
          : nextValue.slice(
              0,
              11
            );
    }

    if (
      name ===
      'postal_code'
    ) {
      nextValue =
        value
          .replace(
            /\D/g,
            ''
          )
          .slice(
            0,
            5
          );
    }

    if (
      name ===
      'phone'
    ) {
      nextValue =
        value
          .replace(
            /[^\d+\s()-]/g,
            ''
          )
          .slice(
            0,
            25
          );
    }

    setFormData(
      (current) => ({
        ...current,
        [name]:
          nextValue,
      })
    );

    if (
      errors[name]
    ) {
      setErrors(
        (current) => ({
          ...current,
          [name]:
            '',
        })
      );
    }
  };

  // ======================================================
  // CLIENT TYPE
  // ======================================================

  const handleClientTypeChange =
    (type) => {
      if (
        isPending ||
        !canEdit
      ) {
        return;
      }

      if (
        formData.client_type ===
        type
      ) {
        return;
      }

      setFormData(
        (current) => ({
          ...current,

          client_type:
            type,

          /*
           * TCKN ve VKN farklı veri tipleridir.
           * Tür değişince eski değer tutulmaz.
           */
          identification_number:
            '',
        })
      );

      setErrors(
        (current) => ({
          ...current,

          client_type:
            '',

          identification_number:
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
        formData.name.trim();

      const identificationNumber =
        String(
          formData.identification_number ||
          ''
        )
          .replace(
            /\D/g,
            ''
          )
          .trim();

      const email =
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase();

      const phone =
        normalizePhone(
          formData.phone
        );

      const postalCode =
        String(
          formData.postal_code ||
          ''
        )
          .replace(
            /\D/g,
            ''
          )
          .trim();

      // ==================================================
      // NAME
      // ==================================================

      if (
        !name
      ) {
        nextErrors.name =
          isCorporate
            ? 'Şirket / kurum unvanı gereklidir'
            : 'Ad Soyad gereklidir';
      } else if (
        name.length <
        2
      ) {
        nextErrors.name =
          'Müvekkil adı en az 2 karakter olmalıdır';
      } else if (
        name.length >
        255
      ) {
        nextErrors.name =
          'Müvekkil adı en fazla 255 karakter olabilir';
      }

      // ==================================================
      // IDENTIFICATION
      // ==================================================

      if (
        identificationNumber
      ) {
        if (
          isCorporate
        ) {
          if (
            identificationNumber.length !==
            10
          ) {
            nextErrors.identification_number =
              'Vergi Kimlik Numarası 10 haneli olmalıdır';
          }
        } else {
          if (
            identificationNumber.length !==
            11
          ) {
            nextErrors.identification_number =
              'T.C. Kimlik Numarası 11 haneli olmalıdır';
          } else if (
            identificationNumber.startsWith(
              '0'
            )
          ) {
            nextErrors.identification_number =
              'T.C. Kimlik Numarası 0 ile başlayamaz';
          } else if (
            Number(
              identificationNumber[10]
            ) % 2 !==
            0
          ) {
            nextErrors.identification_number =
              'T.C. Kimlik Numarasının son hanesi çift olmalıdır';
          } else if (
            !isValidTCKN(
              identificationNumber
            )
          ) {
            nextErrors.identification_number =
              'Geçerli bir T.C. Kimlik Numarası giriniz';
          }
        }
      }

      // ==================================================
      // PHONE
      // ==================================================

      if (
        phone
      ) {
        const digits =
          phone.replace(
            /\D/g,
            ''
          );

        if (
          digits.length <
            10 ||
          digits.length >
            15
        ) {
          nextErrors.phone =
            'Geçerli bir telefon numarası giriniz';
        }
      }

      // ==================================================
      // EMAIL
      // ==================================================

      if (
        email &&
        !validateEmail(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi giriniz';
      }

      if (
        email.length >
        254
      ) {
        nextErrors.email =
          'E-posta adresi çok uzun';
      }

      // ==================================================
      // POSTAL CODE
      // ==================================================

      if (
        postalCode &&
        postalCode.length !==
        5
      ) {
        nextErrors.postal_code =
          'Posta kodu 5 haneli olmalıdır';
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
      // CITY
      // ==================================================

      if (
        formData.city.length >
        100
      ) {
        nextErrors.city =
          'Şehir en fazla 100 karakter olabilir';
      }

      // ==================================================
      // DISTRICT
      // ==================================================

      if (
        formData.district.length >
        100
      ) {
        nextErrors.district =
          'İlçe en fazla 100 karakter olabilir';
      }

      // ==================================================
      // NOTES
      // ==================================================

      if (
        formData.notes.length >
        5000
      ) {
        nextErrors.notes =
          'Genel not en fazla 5000 karakter olabilir';
      }

      // ==================================================
      // TAGS
      // ==================================================

      const tags =
        normalizeTags(
          formData.tags
        );

      if (
        tags.length >
        30
      ) {
        nextErrors.tags =
          'En fazla 30 etiket eklenebilir';
      }

      if (
        tags.some(
          (tag) =>
            tag.length >
            50
        )
      ) {
        nextErrors.tags =
          'Etiketler en fazla 50 karakter olabilir';
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
  // BACKEND ERROR MAPPING
  // ======================================================

  const mapBackendError =
    (
      mutationError
    ) => {
      const responseErrors =
        mutationError?.response
          ?.data?.errors;

      const message =
        mutationError?.response
          ?.data?.message ||
        mutationError?.message ||
        '';

      const nextErrors =
        {};

      /*
       * express-validator errors
       */
      if (
        Array.isArray(
          responseErrors
        )
      ) {
        responseErrors.forEach(
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

      /*
       * Service / Sequelize error
       */
      if (
        /TCKNO|T\.C\.|VKN|kimlik|identification_number/i.test(
          message
        )
      ) {
        nextErrors.identification_number =
          message;
      }

      if (
        /email|e-posta/i.test(
          message
        )
      ) {
        nextErrors.email =
          message;
      }

      if (
        /phone|telefon/i.test(
          message
        )
      ) {
        nextErrors.phone =
          message;
      }

      if (
        /name|ad soyad|unvan|müvekkil adı/i.test(
          message
        )
      ) {
        nextErrors.name =
          message;
      }

      if (
        /posta kodu|postal/i.test(
          message
        )
      ) {
        nextErrors.postal_code =
          message;
      }

      if (
        Object.keys(
          nextErrors
        ).length >
        0
      ) {
        setErrors(
          nextErrors
        );

        toast.error(
          'Formdaki hatalı alanları kontrol edin'
        );

        return;
      }

      toast.error(
        message ||
        'Müvekkil güncellenemedi'
      );
    };

  // ======================================================
  // UPDATE
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      !canEdit
    ) {
      toast.error(
        'Müvekkil düzenleme yetkiniz bulunmuyor'
      );

      return;
    }

    if (
      updateMutation.isPending
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

    if (
      !isDirty
    ) {
      toast(
        'Kaydedilecek bir değişiklik bulunmuyor'
      );

      return;
    }

    updateMutation.mutate(
      {
        id,

        data:
          normalizedPayload,
      },
      {
        onSuccess: () => {
          toast.success(
            'Müvekkil bilgileri güncellendi'
          );

          navigate(
            `/clients/${id}`
          );
        },

        onError: (
          mutationError
        ) => {
          mapBackendError(
            mutationError
          );
        },
      }
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
            'Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinize emin misiniz?'
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      navigate(
        `/clients/${id}`
      );
    };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (
        !canDelete
      ) {
        toast.error(
          'Müvekkil kaydını kaldırma yetkiniz bulunmuyor'
        );

        return;
      }

      if (
        deleteMutation.isPending
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `"${client?.name}" müvekkil kaydını kaldırmak istediğinize emin misiniz?\n\nKayıt sistemden kaldırılacak ancak ilişkili kayıtlar ayrıca silinmeyecektir.`
        );

      if (
        !confirmed
      ) {
        return;
      }

      deleteMutation.mutate(
        id,
        {
          onSuccess:
            () => {
              toast.success(
                'Müvekkil kaydı kaldırıldı'
              );

              navigate(
                '/clients'
              );
            },

          onError:
            (
              mutationError
            ) => {
              toast.error(
                mutationError?.response
                  ?.data?.message ||
                mutationError?.message ||
                'Müvekkil kaydı kaldırılamadı'
              );
            },
        }
      );
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Müvekkil bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !client
  ) {
    return (
      <div className="py-16 text-center">

        <div className="mb-4 text-5xl">
          👤
        </div>

        <h2 className="text-xl font-semibold text-red-600">
          Müvekkil bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Bu kayıt silinmiş olabilir veya görüntüleme yetkiniz bulunmayabilir.
        </p>

        <Link
          to="/clients"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkillere Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // PERMISSION ERROR
  // ======================================================

  if (
    !canEdit
  ) {
    return (
      <div className="mx-auto max-w-3xl py-12">

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-900/10">

          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />

          <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            Düzenleme yetkiniz bulunmuyor
          </h2>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Bu müvekkilin bilgilerini görüntüleyebilirsiniz ancak değiştiremezsiniz.
          </p>

          <Link
            to={`/clients/${id}`}
          >
            <Button
              className="mt-4"
              variant="secondary"
            >
              Müvekkil Detayına Dön
            </Button>
          </Link>

        </div>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/clients/${id}`}
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkil Detayı
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Müvekkil Bilgilerini Düzenle
          </h1>

          {isDirty && (
            <Badge
              variant="warning"
            >
              Kaydedilmemiş değişiklik
            </Badge>
          )}

        </div>

        <p className="mt-1 text-sm text-gray-500">
          Kimlik, iletişim, adres ve sınıflandırma bilgilerini güncelleyin.
        </p>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* CLIENT TYPE */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Müvekkil Türü
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={() =>
                  handleClientTypeChange(
                    'individual'
                  )
                }
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  !isCorporate
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <UserRound className="h-5 w-5 text-blue-600" />

                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Bireysel
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Gerçek kişi müvekkil
                  </p>
                </div>

              </button>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={() =>
                  handleClientTypeChange(
                    'corporate'
                  )
                }
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCorporate
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <Building2 className="h-5 w-5 text-blue-600" />

                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Kurumsal
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Şirket veya kurum
                  </p>
                </div>

              </button>

            </div>

          </div>

          <Input
            label={
              isCorporate
                ? 'Şirket / Kurum Unvanı *'
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
              isCorporate
                ? 'Örn: ABC Teknoloji A.Ş.'
                : 'Örn: Ahmet Yılmaz'
            }
          />

          <Input
            label={
              isCorporate
                ? 'Vergi Kimlik Numarası'
                : 'T.C. Kimlik Numarası'
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
              isCorporate
                ? 10
                : 11
            }
            placeholder={
              isCorporate
                ? '10 haneli VKN'
                : '11 haneli TCKNO'
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
              placeholder="+90 5XX XXX XX XX"
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
              placeholder="ornek@domain.com"
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
              maxLength={1000}
              rows="3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Açık adres..."
            />

            {errors.address && (
              <p className="mt-1 text-xs text-red-600">
                {errors.address}
              </p>
            )}

          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <Input
              label="Şehir"
              name="city"
              value={
                formData.city
              }
              onChange={
                handleChange
              }
              error={
                errors.city
              }
              disabled={
                isPending
              }
              maxLength={100}
            />

            <Input
              label="İlçe"
              name="district"
              value={
                formData.district
              }
              onChange={
                handleChange
              }
              error={
                errors.district
              }
              disabled={
                isPending
              }
              maxLength={100}
            />

            <Input
              label="Posta Kodu"
              name="postal_code"
              value={
                formData.postal_code
              }
              onChange={
                handleChange
              }
              error={
                errors.postal_code
              }
              disabled={
                isPending
              }
              inputMode="numeric"
              maxLength={5}
              placeholder="34000"
            />

          </div>

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Durum
            </label>

            <select
              name="status"
              value={
                formData.status
              }
              onChange={
                handleChange
              }
              disabled={
                isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="active">
                Aktif
              </option>

              <option value="passive">
                Pasif
              </option>

              <option value="archived">
                Arşiv
              </option>
            </select>

            {formData.status ===
              'archived' && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">

                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <p>
                  Arşiv durumu müvekkili silmez. Kayıt sistemde kalır ve ilişkili kayıtlarla bağlantısını korur.
                </p>

              </div>
            )}

          </div>

          <div>

            <Input
              label="Etiketler"
              name="tags"
              value={
                formData.tags
              }
              onChange={
                handleChange
              }
              error={
                errors.tags
              }
              disabled={
                isPending
              }
              placeholder="VIP, şirket, ceza, icra"
            />

            <p className="mt-1 text-xs text-gray-500">
              Birden fazla etiketi virgülle ayırın. En fazla 30 etiket eklenebilir.
            </p>

            {tagsPreview.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">

                {tagsPreview.map(
                  (
                    tag
                  ) => (
                    <Badge
                      key={
                        tag
                      }
                      variant="default"
                    >
                      #{tag}
                    </Badge>
                  )
                )}

              </div>
            )}

          </div>

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Genel Not
            </label>

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
              maxLength={5000}
              rows="5"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Müvekkille ilgili önemli genel bilgiler..."
            />

            <div className="mt-1 flex justify-between gap-3">
              {errors.notes ? (
                <p className="text-xs text-red-600">
                  {errors.notes}
                </p>
              ) : (
                <span />
              )}

              <p className="text-xs text-gray-400">
                {formData.notes.length}/5000
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                updateMutation.isPending
              }
              disabled={
                isPending ||
                !isDirty
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
              onClick={
                handleCancel
              }
            >
              Vazgeç
            </Button>

            {canDelete && (
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
                className="sm:ml-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Kaydı Kaldır
              </Button>
            )}

          </div>

        </form>

      </Card>

    </div>
  );
};

export default ClientEdit;