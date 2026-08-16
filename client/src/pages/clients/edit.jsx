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

  return (
    normalized ||
    null
  );
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

// ======================================================
// COMPONENT
// ======================================================

const ClientEdit = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const {
    data,
    isLoading,
    error,
  } = useClient(id);

  const updateMutation =
    useUpdateClient();

  const deleteMutation =
    useDeleteClient();

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
  // DATA
  // ======================================================

  const client =
    data?.data?.data ??
    data?.data ??
    null;

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canDelete =
    user?.role ===
    'admin';

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

    setFormData({
      name:
        client.name ||
        '',

      identification_number:
        client.identification_number ||
        '',

      email:
        client.email ||
        '',

      phone:
        client.phone ||
        '',

      address:
        client.address ||
        '',

      city:
        client.city ||
        '',

      district:
        client.district ||
        '',

      postal_code:
        client.postal_code ||
        '',

      notes:
        client.notes ||
        '',

      tags:
        Array.isArray(
          client.tags
        )
          ? client.tags.join(
              ', '
            )
          : '',

      client_type:
        client.client_type ||
        'individual',

      status:
        client.status ||
        'active',
    });
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

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

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
          [name]: '',
        })
      );
    }
  };

  // ======================================================
  // CLIENT TYPE CHANGE
  // ======================================================

  const handleClientTypeChange = (
    type
  ) => {
    if (isPending) {
      return;
    }

    setFormData(
      (current) => ({
        ...current,

        client_type:
          type,

        /*
         * Tür değişince mevcut TCKNO/VKN değerini
         * otomatik silmiyoruz.
         *
         * Kullanıcı karar versin; validation yanlış
         * uzunluğu zaten yakalayacak.
         */
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
          .replace(/\s+/g, '')
          .trim();

      const email =
        formData.email
          .trim()
          .toLowerCase();

      const phone =
        normalizePhone(
          formData.phone
        );

      if (!name) {
        nextErrors.name =
          isCorporate
            ? 'Şirket / kurum unvanı gereklidir'
            : 'Ad Soyad gereklidir';
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

      if (
        email &&
        !validateEmail(
          email
        )
      ) {
        nextErrors.email =
          'Geçerli bir e-posta adresi giriniz';
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
  // UPDATE
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

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

    const payload = {
      name:
        formData.name.trim(),

      identification_number:
        normalizeNullable(
          formData.identification_number.replace(
            /\s+/g,
            ''
          )
        ),

      email:
        normalizeNullable(
          formData.email
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

    updateMutation.mutate(
      {
        id,
        data:
          payload,
      },
      {
        onSuccess: () => {
          navigate(
            `/clients/${id}`
          );
        },

        onError: (
          mutationError
        ) => {
          const message =
            mutationError?.response
              ?.data?.message ||
            mutationError?.message ||
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
          } else if (
            /email|e-posta/i.test(
              message
            )
          ) {
            nextErrors.email =
              message;
          } else if (
            /phone|telefon/i.test(
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
              nextErrors
            );
          }
        },
      }
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
          `"${client?.name}" müvekkil kaydını kaldırmak istediğinize emin misiniz?\n\nKayıt soft-delete olarak kaldırılacaktır.`
        );

      if (!confirmed) {
        return;
      }

      deleteMutation.mutate(
        id,
        {
          onSuccess: () => {
            navigate(
              '/clients'
            );
          },
        }
      );
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
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
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Müvekkil bilgileri yüklenemedi'}
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

        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Müvekkil Bilgilerini Düzenle
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Kimlik, iletişim, adres ve müvekkil sınıflandırma bilgilerini güncelleyin.
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
              isPending
            }
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

          {/* CONTACT */}

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
                isPending
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
                isPending
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
                isPending
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
              disabled={
                isPending
              }
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
                  Arşiv durumu müvekkili silmez. Kayıt sistemde kalmaya ve ilişkili dava/belgelerle çalışmaya devam eder.
                </p>

              </div>
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
                isPending
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
                  (tag) => (
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
                isPending
              }
              rows="4"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Müvekkille ilgili önemli genel bilgiler..."
            />

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                updateMutation.isPending
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
                  `/clients/${id}`
                )
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