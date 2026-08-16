import {
  useMemo,
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
      value
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
  email
) => {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
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
    useMemo(() => {
      return normalizeTags(
        formData.tags
      );
    }, [
      formData.tags,
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

    setFormData(
      (current) => ({
        ...current,
        [name]:
          value,
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

      setFormData(
        (current) => ({
          ...current,
          client_type:
            type,
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
        if (
          !/^\d+$/.test(
            identificationNumber
          )
        ) {
          nextErrors.identification_number =
            'Kimlik / vergi numarası yalnızca rakamlardan oluşmalıdır';
        } else if (
          isCorporate &&
          identificationNumber.length !==
            10
        ) {
          nextErrors.identification_number =
            'VKN 10 haneli olmalıdır';
        } else if (
          !isCorporate &&
          identificationNumber.length !==
            11
        ) {
          nextErrors.identification_number =
            'TCKNO 11 haneli olmalıdır';
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
        formData.postal_code &&
        formData.postal_code.trim().length >
          20
      ) {
        nextErrors.postal_code =
          'Posta kodu en fazla 20 karakter olabilir';
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
        {};

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
          const createdClient =
            response?.data?.data ??
            response?.data ??
            null;

          if (
            createdClient?.id
          ) {
            navigate(
              `/clients/${createdClient.id}`
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
                createMutation.isPending
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
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Açık adres..."
            />

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
              maxLength={20}
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
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Müvekkille ilgili önemli genel bilgiler..."
            />

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
              onClick={() =>
                navigate(
                  '/clients'
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

export default ClientCreate;