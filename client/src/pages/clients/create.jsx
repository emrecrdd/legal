import {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useCreateClient,
} from '../../features/clients/client.query.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  Building2,
  Save,
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

const CLIENT_TYPE_OPTIONS = [
  'individual',
  'corporate',
];

const STATUS_OPTIONS = [
  'active',
  'passive',
  'archived',
];

const MAX_LENGTHS = {
  name: 255,
  email: 254,
  phoneDigits: 15,
  address: 1000,
  city: 100,
  district: 100,
  postal_code: 5,
  notes: 5000,
  tags: 1000,
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

  const seen =
    new Set();

  return String(
    value
  )
    .split(',')
    .map(
      (tag) =>
        tag.trim()
    )
    .filter(Boolean)
    .filter(
      (tag) => {
        const key =
          tag.toLocaleLowerCase(
            'tr-TR'
          );

        if (
          seen.has(
            key
          )
        ) {
          return false;
        }

        seen.add(
          key
        );

        return true;
      }
    );
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
  email
) => {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};

const validateTCKN = (
  value
) => {
  if (!/^[1-9]\d{10}$/.test(value)) {
    return false;
  }

  const digits =
    value
      .split('')
      .map(Number);

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

  const tenthDigit =
    (((oddSum * 7) - evenSum) % 10 + 10) % 10;

  if (tenthDigit !== digits[9]) {
    return false;
  }

  const eleventhDigit =
    digits
      .slice(0, 10)
      .reduce(
        (sum, digit) => sum + digit,
        0
      ) % 10;

  return eleventhDigit === digits[10];
};

const sanitizeDigits = (
  value,
  maxLength
) => {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength);
};

const sanitizePhoneInput = (
  value
) => {
  const raw =
    String(
      value ??
      ''
    );

  const hasLeadingPlus =
    raw
      .trim()
      .startsWith(
        '+'
      );

  const digits =
    raw
      .replace(
        /\D/g,
        ''
      )
      .slice(
        0,
        MAX_LENGTHS.phoneDigits
      );

  return hasLeadingPlus
    ? `+${digits}`
    : digits;
};

const getBackendFieldErrors = (
  error
) => {
  const backendErrors =
    error?.response
      ?.data?.errors;

  const result =
    {};

  if (
    Array.isArray(
      backendErrors
    )
  ) {
    backendErrors.forEach(
      (item) => {
        const field =
          item?.path ||
          item?.param ||
          item?.field;

        if (
          field
        ) {
          result[field] =
            item?.msg ||
            item?.message ||
            'Geçersiz değer';
        }
      }
    );

    return result;
  }

  if (
    backendErrors &&
    typeof backendErrors ===
      'object'
  ) {
    Object.entries(
      backendErrors
    ).forEach(
      ([
        field,
        value,
      ]) => {
        if (
          Array.isArray(
            value
          )
        ) {
          result[field] =
            value
              .filter(Boolean)
              .join(', ');

          return;
        }

        if (
          value
        ) {
          result[field] =
            String(
              value
            );
        }
      }
    );
  }

  return result;
};

const getCreatedClientId = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    null;

  const value =
    payload?.id ??
    payload?._id;

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  return String(
    value
  );
};

const normalizeFormForComparison = (
  formData
) => {
  return JSON.stringify({
    ...buildPayload(
      formData
    ),

    tags:
      normalizeTags(
        formData.tags
      ),
  });
};

const buildPayload = (
  formData
) => {
  return {
    name:
      formData.name.trim(),

    identification_number:
      normalizeNullable(
        String(
          formData.identification_number ||
          ''
        ).replace(
          /\s+/g,
          ''
        )
      ),

    email:
      normalizeNullable(
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase()
      ),

    phone:
      normalizeNullable(
        normalizePhone(
          formData.phone
        )
      ),

    address:
      normalizeNullable(
        formData.address
      ),

    city:
      normalizeNullable(
        formData.city
      ),

    district:
      normalizeNullable(
        formData.district
      ),

    postal_code:
      normalizeNullable(
        formData.postal_code
      ),

    notes:
      normalizeNullable(
        formData.notes
      ),

    tags:
      normalizeTags(
        formData.tags
      ),

    client_type:
      formData.client_type,

    status:
      formData.status,
  };
};

// ======================================================
// COMPONENT
// ======================================================

const ClientCreate = () => {
  const navigate =
    useNavigate();

  const createMutation =
    useCreateClient();

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    errors,
    setErrors,
  ] = useState({});

  // ======================================================
  // DERIVED
  // ======================================================

  const isCorporate =
    formData.client_type ===
    'corporate';

  const tagsPreview =
    normalizeTags(
      formData.tags
    );

  const isDirty =
    normalizeFormForComparison(
      formData
    ) !==
    normalizeFormForComparison(
      INITIAL_FORM
    );

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      createMutation.isPending
    ) {
      return;
    }

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
      nextValue = sanitizeDigits(
        value,
        isCorporate
          ? 10
          : 11
      );
    }

    if (name === 'postal_code') {
      nextValue = sanitizeDigits(
        value,
        5
      );
    }

    if (name === 'phone') {
      nextValue =
        sanitizePhoneInput(
          value
        );
    }

    if (
      name ===
      'name'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.name
        );
    }

    if (
      name ===
      'email'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.email
        );
    }

    if (
      name ===
      'address'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.address
        );
    }

    if (
      name ===
      'city'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.city
        );
    }

    if (
      name ===
      'district'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.district
        );
    }

    if (
      name ===
      'notes'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.notes
        );
    }

    if (
      name ===
      'tags'
    ) {
      nextValue =
        String(
          value
        ).slice(
          0,
          MAX_LENGTHS.tags
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
        createMutation.isPending
      ) {
        return;
      }

      if (
        !CLIENT_TYPE_OPTIONS.includes(
          type
        )
      ) {
        return;
      }

      setFormData(
        (current) => ({
          ...current,
          client_type:
            type,
          identification_number:
            '',
        })
      );

      setErrors(
        (current) => ({
          ...current,
          identification_number:
            '',
          client_type:
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
            /\s+/g,
            ''
          )
          .trim();

      const phone =
        normalizePhone(
          formData.phone
        );

      const email =
        String(
          formData.email ||
          ''
        )
          .trim()
          .toLowerCase();

      if (!name) {
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

      if (
        identificationNumber
      ) {
        if (isCorporate) {
          if (
            !/^\d{10}$/.test(
              identificationNumber
            )
          ) {
            nextErrors.identification_number =
              'Vergi Kimlik Numarası 10 haneli olmalıdır';
          }
        } else if (
          identificationNumber.length !==
          11
        ) {
          nextErrors.identification_number =
            'T.C. Kimlik Numarası 11 haneli olmalıdır';
        } else if (
          identificationNumber[0] ===
          '0'
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
          !validateTCKN(
            identificationNumber
          )
        ) {
          nextErrors.identification_number =
            'Geçerli bir T.C. Kimlik Numarası giriniz';
        }
      }

      if (phone) {
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
        MAX_LENGTHS.email
      ) {
        nextErrors.email =
          'E-posta adresi çok uzun';
      }

      if (
        formData.address.length >
        MAX_LENGTHS.address
      ) {
        nextErrors.address =
          `Adres en fazla ${MAX_LENGTHS.address} karakter olabilir`;
      }

      if (
        formData.city.length >
        MAX_LENGTHS.city
      ) {
        nextErrors.city =
          `Şehir en fazla ${MAX_LENGTHS.city} karakter olabilir`;
      }

      if (
        formData.district.length >
        MAX_LENGTHS.district
      ) {
        nextErrors.district =
          `İlçe en fazla ${MAX_LENGTHS.district} karakter olabilir`;
      }

      if (
        formData.notes.length >
        MAX_LENGTHS.notes
      ) {
        nextErrors.notes =
          `Notlar en fazla ${MAX_LENGTHS.notes} karakter olabilir`;
      }

      if (
        formData.tags.length >
        MAX_LENGTHS.tags
      ) {
        nextErrors.tags =
          `Etiket alanı en fazla ${MAX_LENGTHS.tags} karakter olabilir`;
      }

      if (
        !CLIENT_TYPE_OPTIONS.includes(
          formData.client_type
        )
      ) {
        nextErrors.client_type =
          'Geçersiz müvekkil türü';
      }

      if (
        !STATUS_OPTIONS.includes(
          formData.status
        )
      ) {
        nextErrors.status =
          'Geçersiz müvekkil durumu';
      }

      if (
        formData.postal_code &&
        !/^\d{5}$/.test(
          formData.postal_code
        )
      ) {
        nextErrors.postal_code =
          'Posta kodu 5 haneli olmalıdır';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  // ======================================================
  // BACKEND ERROR MAPPING
  // ======================================================

  const mapBackendError =
    (error) => {
      const message =
        error?.response
          ?.data?.message ||
        error?.message ||
        '';

      const nextErrors =
        getBackendFieldErrors(
          error
        );

      if (
        /TCKNO|VKN|identification_number/i.test(
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
        /name|ad soyad|unvan/i.test(
          message
        )
      ) {
        nextErrors.name =
          message;
      }

      if (
        /address|adres/i.test(
          message
        )
      ) {
        nextErrors.address =
          message;
      }

      if (
        /city|şehir|sehir/i.test(
          message
        )
      ) {
        nextErrors.city =
          message;
      }

      if (
        /district|ilçe|ilce/i.test(
          message
        )
      ) {
        nextErrors.district =
          message;
      }

      if (
        /postal|posta/i.test(
          message
        )
      ) {
        nextErrors.postal_code =
          message;
      }

      if (
        /tag|etiket/i.test(
          message
        )
      ) {
        nextErrors.tags =
          message;
      }

      if (
        /status|durum/i.test(
          message
        )
      ) {
        nextErrors.status =
          message;
      }

      if (
        /client_type|müvekkil türü|müvekkil tipi/i.test(
          message
        )
      ) {
        nextErrors.client_type =
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

        return true;
      }

      return false;
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      createMutation.isPending
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

    const payload =
      buildPayload(
        formData
      );

    createMutation.mutate(
      payload,
      {
        onSuccess: (
          response
        ) => {
          const createdId =
            getCreatedClientId(
              response
            );

          if (
            createdId
          ) {
            navigate(
              `/clients/${createdId}`
            );

            return;
          }

          navigate(
            '/clients'
          );
        },

        onError: (
          error
        ) => {
          const handled =
            mapBackendError(
              error
            );

          if (!handled) {
            toast.error(
              error?.response
                ?.data?.message ||
                error?.message ||
                'Müvekkil oluşturulamadı'
            );
          }
        },
      }
    );
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/clients"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkiller
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Yeni Müvekkil
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Müvekkilin kimlik, iletişim, adres ve sınıflandırma bilgilerini oluşturun.
        </p>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* TYPE */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Müvekkil Türü
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <button
                type="button"
                disabled={
                  createMutation.isPending
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
                  createMutation.isPending
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

            {errors.client_type && (
              <p className="mt-2 text-sm text-red-600">
                {errors.client_type}
              </p>
            )}

          </div>

          {/* NAME */}

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
              createMutation.isPending
            }
            maxLength={255}
            placeholder={
              isCorporate
                ? 'Örn: ABC Teknoloji A.Ş.'
                : 'Örn: Ahmet Yılmaz'
            }
          />

          {/* IDENTIFICATION */}

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
              createMutation.isPending
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

          {/* CONTACT */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="Telefon"
              name="phone"
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
                createMutation.isPending
              }
              type="tel"
              inputMode="tel"
              maxLength={
                MAX_LENGTHS.phoneDigits + 1
              }
              placeholder="+905XXXXXXXXX"
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
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.email
              }
              placeholder="ornek@domain.com"
            />

          </div>

          {/* ADDRESS */}

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
                createMutation.isPending
              }
              rows="3"
              maxLength={
                MAX_LENGTHS.address
              }
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.address
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Açık adres..."
            />

            {errors.address && (
              <p className="mt-1 text-sm text-red-600">
                {errors.address}
              </p>
            )}

          </div>

          {/* LOCATION */}

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
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.city
              }
              error={
                errors.city
              }
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
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.district
              }
              error={
                errors.district
              }
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
                createMutation.isPending
              }
              inputMode="numeric"
              maxLength={5}
              placeholder="5 haneli posta kodu"
            />

          </div>

          {/* STATUS */}

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
                createMutation.isPending
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

            {errors.status && (
              <p className="mt-1 text-sm text-red-600">
                {errors.status}
              </p>
            )}

          </div>

          {/* TAGS */}

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
              disabled={
                createMutation.isPending
              }
              maxLength={
                MAX_LENGTHS.tags
              }
              error={
                errors.tags
              }
              placeholder="VIP, şirket, ceza, icra"
            />

            <p className="mt-1 text-xs text-gray-500">
              Birden fazla etiketi virgülle ayırın.
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

          {/* NOTES */}

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
                createMutation.isPending
              }
              rows="5"
              maxLength={
                MAX_LENGTHS.notes
              }
              className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                errors.notes
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Müvekkille ilgili önemli genel bilgiler..."
            />

            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">
                {errors.notes}
              </p>
            )}

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                createMutation.isPending
              }
              disabled={
                createMutation.isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Müvekkili Oluştur
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                createMutation.isPending
              }
              onClick={() => {
                if (
                  createMutation.isPending
                ) {
                  return;
                }

                if (
                  isDirty &&
                  !window.confirm(
                    'Kaydedilmemiş müvekkil bilgileri var. Sayfadan ayrılmak istediğinize emin misiniz?'
                  )
                ) {
                  return;
                }

                navigate(
                  '/clients'
                );
              }}
            >
              Vazgeç
            </Button>

          </div>

        </form>

      </Card>

    </div>
  );
};

export default ClientCreate;