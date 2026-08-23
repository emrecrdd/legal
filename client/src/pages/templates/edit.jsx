import {
  useEffect,
  useRef,
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

import {
  templateApi,
} from '../../features/templates/template.api.js';

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
  FileText,
  FolderOpen,
  RefreshCw,
  Save,
  Scale,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const CATEGORY_OPTIONS = [
  {
    value: 'dilekce',
    label: 'Dilekçe',
  },
  {
    value: 'ihtar',
    label: 'İhtar',
  },
  {
    value: 'sozlesme',
    label: 'Sözleşme',
  },
];

const LAW_AREA_OPTIONS = [
  {
    value: 'ozel_hukuk',
    label: 'Özel Hukuk',
  },
  {
    value: 'ceza_hukuku',
    label: 'Ceza Hukuku',
  },
  {
    value: 'idare_hukuku',
    label: 'İdare Hukuku',
  },
  {
    value: 'ofis_ici',
    label: 'Ofis İçi',
  },
];

// ======================================================
// HELPERS
// ======================================================

const formatFileSize = (bytes) => {
  const size =
    Number(bytes) || 0;

  if (size <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.min(
    Math.floor(
      Math.log(size) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(2)
  )} ${units[index]}`;
};

const getCategoryLabel = (value) => {
  return (
    CATEGORY_OPTIONS.find(
      (item) =>
        item.value === value
    )?.label ||
    value ||
    '-'
  );
};

const getLawAreaLabel = (value) => {
  return (
    LAW_AREA_OPTIONS.find(
      (item) =>
        item.value === value
    )?.label ||
    value ||
    '-'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TemplateEdit = () => {
  const navigate =
    useNavigate();

  const { id } =
    useParams();

  const queryClient =
    useQueryClient();

  const {
    user,
  } = useAuth();

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_TEMPLATES
    );

  const fileInputRef =
    useRef(null);

  const [
    formData,
    setFormData,
  ] = useState({
    title: '',
    description: '',
    category: 'dilekce',
    law_area: 'ozel_hukuk',
  });

  const [
    file,
    setFile,
  ] = useState(null);

  const [
    fileError,
    setFileError,
  ] = useState('');

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    initializedTemplateId,
    setInitializedTemplateId,
  ] = useState(null);

  // ======================================================
  // TEMPLATE QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'template',
      id,
    ],

    queryFn: () =>
      templateApi.getOne(id),

    enabled:
      Boolean(id),
  });

  const template =
    data?.data?.data;

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    if (
      !template ||
      initializedTemplateId ===
        template.id
    ) {
      return;
    }

    setFormData({
      title:
        template.title || '',

      description:
        template.description || '',

      category:
        template.category ||
        'dilekce',

      law_area:
        template.law_area ||
        'ozel_hukuk',
    });

    setInitializedTemplateId(
      template.id
    );
  }, [
    template,
    initializedTemplateId,
  ]);

  // ======================================================
  // UPDATE
  // ======================================================

  const updateMutation =
    useMutation({
      mutationFn: (payload) =>
        templateApi.update(
          id,
          payload
        ),

      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              'templates',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'template',
              id,
            ],
          }),
        ]);

        toast.success(
          'Şablon başarıyla güncellendi'
        );

        navigate(
          `/templates/${id}`
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
            'Şablon güncellenemedi'
        );
      },
    });

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useMutation({
      mutationFn: () =>
        templateApi.delete(id),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            'templates',
          ],
        });

        toast.success(
          'Şablon silindi'
        );

        navigate(
          '/templates'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
            'Şablon silinemedi'
        );
      },
    });

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
        [name]: value,
      })
    );

    if (errors[name]) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  // ======================================================
  // FILE
  // ======================================================

  const handleFileChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setFileError(
        'Dosya boyutu 10 MB’dan büyük olamaz.'
      );

      setFile(null);

      event.target.value =
        '';

      return;
    }

    if (
      !ALLOWED_TYPES.includes(
        selectedFile.type
      )
    ) {
      setFileError(
        'Sadece PDF veya Word dosyası yükleyebilirsiniz.'
      );

      setFile(null);

      event.target.value =
        '';

      return;
    }

    setFileError('');
    setFile(
      selectedFile
    );
  };

  const handleRemoveNewFile =
    () => {
      setFile(null);
      setFileError('');

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm = () => {
    const nextErrors = {};

    if (
      !formData.title.trim()
    ) {
      nextErrors.title =
        'Başlık gereklidir';
    }

    if (
      formData.title.trim()
        .length > 255
    ) {
      nextErrors.title =
        'Başlık en fazla 255 karakter olabilir';
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
  // SUBMIT
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
        'Formdaki hataları kontrol edin'
      );

      return;
    }

    const submitData =
      new FormData();

    submitData.append(
      'title',
      formData.title.trim()
    );

    submitData.append(
      'description',
      formData.description.trim()
    );

    submitData.append(
      'category',
      formData.category
    );

    submitData.append(
      'law_area',
      formData.law_area
    );

    /*
     * Yeni dosya seçildiyse gönder.
     * Seçilmediyse backend mevcut dosyayı korur.
     */
    if (file) {
      submitData.append(
        'file',
        file
      );
    }

    updateMutation.mutate(
      submitData
    );
  };

  // ======================================================
  // DELETE HANDLER
  // ======================================================

  const handleDelete = () => {
    if (!canDelete) {
      toast.error(
        'Bu şablonu silme yetkiniz bulunmuyor'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `"${template?.title || 'Bu şablon'}" şablonunu silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate();
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
            Şablon bilgileri yükleniyor...
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
    !template
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <FileText className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Şablon Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            'Şablon bilgileri yüklenemedi'}
        </p>

        <Link
          to="/templates"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Şablonlara Dön
        </Link>

      </div>
    );
  }

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
          to={`/templates/${id}`}
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-medium
            text-gray-500
            transition
            hover:text-blue-600
            dark:text-slate-500
            dark:hover:text-blue-400
          "
        >
          <ArrowLeft className="h-3.5 w-3.5" />

          Şablon Detayı
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-blue-600
              dark:bg-blue-500/[0.08]
              dark:text-blue-400
            "
          >
            <FileText size={21} />
          </div>

          <div className="min-w-0">

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              Şablon Düzenle
            </h1>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
              Şablonun sınıflandırmasını, açıklamasını ve gerektiğinde dosyasını güncelleyin.
            </p>

            <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">
              {template.title}
            </p>

          </div>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* ==================================================
            TEMPLATE INFO
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                  dark:bg-blue-500/[0.08]
                  dark:text-blue-400
                "
              >
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Şablon Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Başlık ve açıklama bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Şablon Başlığı *"
              name="title"
              value={
                formData.title
              }
              onChange={
                handleChange
              }
              error={
                errors.title
              }
              placeholder="Örn: İcra Takibi Dilekçesi"
              disabled={
                updateMutation.isPending
              }
            />

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Açıklama
              </label>

              <textarea
                name="description"
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                disabled={
                  updateMutation.isPending
                }
                rows={4}
                className="
                  w-full
                  resize-y
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  leading-6
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
                placeholder="Şablon hakkında kısa açıklama..."
              />

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            CLASSIFICATION
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
                <FolderOpen size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Sınıflandırma
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Kategori ve hukuk alanını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CATEGORY */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Kategori
                </label>

                <select
                  name="category"
                  value={
                    formData.category
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    updateMutation.isPending
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >

                  {CATEGORY_OPTIONS.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* LAW AREA */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Hukuk Alanı
                </label>

                <select
                  name="law_area"
                  value={
                    formData.law_area
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    updateMutation.isPending
                  }
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-gray-200
                    bg-white
                    px-3.5
                    text-sm
                    text-gray-700
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >

                  {LAW_AREA_OPTIONS.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            CURRENT FILE
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Mevcut Dosya
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Yeni dosya seçmezseniz bu dosya korunur
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div
              className="
                flex
                flex-col
                gap-4
                rounded-xl
                border
                border-gray-100
                bg-gray-50/70
                p-4
                dark:border-white/[0.05]
                dark:bg-white/[0.02]
                sm:flex-row
                sm:items-center
              "
            >

              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  text-3xl
                  shadow-sm
                  dark:bg-white/[0.04]
                "
              >
                <FileText className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">

                <p className="truncate font-semibold text-gray-900 dark:text-white">
                  {template.file_name ||
                    'Dosya adı bulunamadı'}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-500">

                  <span>
                    {template.file_type ||
                      'Dosya'}
                  </span>

                  <span>
                    •
                  </span>

                  <span>
                    {formatFileSize(
                      template.file_size
                    )}
                  </span>

                  <span>
                    •
                  </span>

                  <span>
                    v
                    {template.version ||
                      1}
                  </span>

                </div>

              </div>

              <Badge variant="success">
                Korunacak
              </Badge>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            REPLACE FILE
        ================================================== */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
                <RefreshCw size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dosyayı Değiştir
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  İsteğe bağlı — yeni PDF veya Word dosyası yükleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            {file ? (
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50/50
                  p-4
                  dark:border-emerald-500/20
                  dark:bg-emerald-500/[0.05]
                  sm:flex-row
                  sm:items-center
                "
              >

                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    text-2xl
                    dark:bg-white/[0.04]
                  "
                >
                  <FileText className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatFileSize(
                      file.size
                    )}
                  </p>

                  <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Kaydedildiğinde mevcut dosyanın yerine kullanılacak
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    handleRemoveNewFile
                  }
                  disabled={
                    updateMutation.isPending
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    px-3
                    text-xs
                    font-medium
                    text-red-600
                    transition
                    hover:bg-red-50
                    disabled:opacity-50
                    dark:text-red-400
                    dark:hover:bg-red-500/[0.08]
                  "
                >
                  <X className="h-4 w-4" />

                  Seçimi Kaldır
                </button>

              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      'Enter' ||
                    event.key ===
                      ' '
                  ) {
                    event.preventDefault();

                    fileInputRef.current?.click();
                  }
                }}
                className="
                  cursor-pointer
                  rounded-xl
                  border-2
                  border-dashed
                  border-gray-200
                  p-8
                  text-center
                  transition
                  hover:border-blue-400
                  hover:bg-blue-50/40
                  dark:border-white/[0.08]
                  dark:hover:border-blue-500/40
                  dark:hover:bg-blue-500/[0.03]
                "
              >

                <UploadCloud className="mx-auto h-10 w-10 text-gray-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Yeni dosya seçmek için tıklayın
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  PDF veya Word · Maksimum 10 MB
                </p>

              </div>
            )}

            <input
              ref={
                fileInputRef
              }
              type="file"
              className="hidden"
              onChange={
                handleFileChange
              }
              disabled={
                updateMutation.isPending
              }
              accept=".pdf,.doc,.docx"
            />

            {fileError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fileError}
              </p>
            )}

            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                bg-amber-50
                p-3
                text-sm
                text-amber-900
                dark:bg-amber-500/[0.06]
                dark:text-amber-200
              "
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Yeni dosya seçerseniz kaydetme sırasında mevcut şablon dosyası güncellenecektir.
                Dosya seçmezseniz mevcut dosya aynen korunur.
              </p>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div
          className="
            grid
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-gray-50/50
            p-4
            dark:border-white/[0.07]
            dark:bg-white/[0.015]
            sm:grid-cols-3
          "
        >

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Kategori
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getCategoryLabel(
                formData.category
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Hukuk Alanı
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getLawAreaLabel(
                formData.law_area
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Dosya
            </p>

            <p
              className={`mt-1 text-sm font-medium ${
                file
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-slate-300'
              }`}
            >
              {file
                ? 'Yeni dosya seçildi'
                : 'Mevcut dosya korunacak'}
            </p>

          </div>

        </div>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.07]
            dark:bg-[#0b1b33]
            sm:flex-row
            sm:items-center
            sm:justify-end
          "
        >

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(
                `/templates/${id}`
              )
            }
            disabled={
              updateMutation.isPending
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              updateMutation.isPending
            }
            disabled={
              deleteMutation.isPending
            }
          >
            <Save className="h-4 w-4" />

            Değişiklikleri Kaydet
          </Button>

        </div>

      </form>

      {/* ==================================================
          DANGER ZONE
      ================================================== */}

      {canDelete && (
        <Card className="border border-red-200 shadow-none dark:border-red-500/20">

          <Card.Body>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Trash2 className="h-5 w-5 text-red-500" />

                  <h2 className="font-semibold text-red-600 dark:text-red-400">
                    Tehlikeli Bölge
                  </h2>

                </div>

                <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-slate-400">
                  Şablonu silmek geri alınamaz. Bu işlem kayıt ve ilişkili dosya davranışlarını backend kurallarınıza göre etkileyebilir.
                </p>

              </div>

              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  updateMutation.isPending
                }
              >
                <Trash2 className="h-4 w-4" />

                Şablonu Sil
              </Button>

            </div>

          </Card.Body>

        </Card>
      )}

    </div>
  );
};

export default TemplateEdit;