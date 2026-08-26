import {
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useMutation,
} from '@tanstack/react-query';

import {
  templateApi,
} from '../../features/templates/template.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FileUp,
  Plus,
  Scale,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  new Set([
    'application/pdf',

    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',

    'text/plain',
  ]);

const ALLOWED_EXTENSIONS =
  new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.txt',
    '.udf',
  ]);

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

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

  if (
    size <= 0
  ) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index =
    Math.min(
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
    value.toFixed(1)
  )} ${units[index]}`;
};

const getFileExtension = (
  fileName = ''
) => {
  const lastDot =
    fileName.lastIndexOf('.');

  if (
    lastDot === -1
  ) {
    return '';
  }

  return fileName
    .slice(lastDot)
    .toLowerCase();
};

const getFileTypeLabel = (
  file
) => {
  if (!file) {
    return '-';
  }

  const extension =
    getFileExtension(
      file.name
    );

  if (
    extension === '.udf'
  ) {
    return 'UYAP UDF';
  }

  if (
    file.type ===
      'application/pdf' ||
    extension === '.pdf'
  ) {
    return 'PDF';
  }

  if (
    file.type ===
      'application/msword' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === '.doc' ||
    extension === '.docx'
  ) {
    return 'Word';
  }

  if (
    file.type ===
      'application/vnd.ms-excel' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    extension === '.xls' ||
    extension === '.xlsx'
  ) {
    return 'Excel';
  }

  if (
    file.type?.startsWith(
      'image/'
    )
  ) {
    return 'Görsel';
  }

  if (
    file.type ===
      'text/plain' ||
    extension === '.txt'
  ) {
    return 'Metin';
  }

  return 'Dosya';
};

// ======================================================
// COMPONENT
// ======================================================

const TemplateCreate = () => {
  const navigate =
    useNavigate();

  const fileInputRef =
    useRef(null);

  const [
    formData,
    setFormData,
  ] =
    useState({
      title: '',
      description: '',
      category: 'dilekce',
      law_area: 'ozel_hukuk',
    });

  const [
    file,
    setFile,
  ] =
    useState(null);

  const [
    fileError,
    setFileError,
  ] =
    useState('');

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(false);

  // ====================================================
  // MUTATION
  // ====================================================

  const mutation =
    useMutation({
      mutationFn: (
        data
      ) =>
        templateApi.create(
          data
        ),

      onSuccess: (
        response
      ) => {
        toast.success(
          'Şablon başarıyla oluşturuldu'
        );

        const templateId =
          response?.data
            ?.data?.id;

        if (
          templateId
        ) {
          navigate(
            `/templates/${templateId}`
          );

          return;
        }

        navigate(
          '/templates'
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
            'Şablon oluşturulamadı'
        );
      },
    });

  // ====================================================
  // FORM HANDLERS
  // ====================================================

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setFormData(
        (
          current
        ) => ({
          ...current,
          [name]:
            value,
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

  // ====================================================
  // FILE VALIDATION
  // ====================================================

  const validateAndSetFile =
    (
      selectedFile
    ) => {
      if (
        !selectedFile
      ) {
        return;
      }

      if (
        selectedFile.size >
        MAX_FILE_SIZE
      ) {
        setFile(
          null
        );

        setFileError(
          'Dosya boyutu 10 MB’dan büyük olamaz.'
        );

        return;
      }

      const extension =
        getFileExtension(
          selectedFile.name
        );

      const isAllowedMime =
        ALLOWED_MIME_TYPES.has(
          selectedFile.type
        );

      const isUdf =
        extension === '.udf';

      const isAllowedExtension =
        ALLOWED_EXTENSIONS.has(
          extension
        );

      if (
        !isAllowedExtension ||
        (
          !isAllowedMime &&
          !isUdf
        )
      ) {
        setFile(
          null
        );

        setFileError(
          'PDF, Word, Excel, görsel, TXT veya UYAP UDF dosyası yükleyebilirsiniz.'
        );

        return;
      }

      setFile(
        selectedFile
      );

      setFileError(
        ''
      );

      setErrors(
        (
          current
        ) => ({
          ...current,
          file:
            '',
        })
      );
    };

  const handleFileChange =
    (
      event
    ) => {
      const selectedFile =
        event.target.files?.[0];

      validateAndSetFile(
        selectedFile
      );
    };

  const handleRemoveFile =
    () => {
      setFile(
        null
      );

      setFileError(
        ''
      );

      setErrors(
        (
          current
        ) => ({
          ...current,
          file:
            '',
        })
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ====================================================
  // DRAG & DROP
  // ====================================================

  const handleDragOver =
    (
      event
    ) => {
      event.preventDefault();

      setIsDragging(
        true
      );
    };

  const handleDragLeave =
    (
      event
    ) => {
      event.preventDefault();

      setIsDragging(
        false
      );
    };

  const handleDrop =
    (
      event
    ) => {
      event.preventDefault();

      setIsDragging(
        false
      );

      const droppedFile =
        event.dataTransfer
          ?.files?.[0];

      validateAndSetFile(
        droppedFile
      );
    };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      const newErrors =
        {};

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          'Şablon başlığı gereklidir';
      }

      if (
        !file
      ) {
        newErrors.file =
          'Şablon dosyası seçilmelidir';
      }

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        setErrors(
          newErrors
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
        formData.description
          ?.trim() ||
          ''
      );

      submitData.append(
        'category',
        formData.category
      );

      submitData.append(
        'law_area',
        formData.law_area
      );

      submitData.append(
        'file',
        file
      );

      mutation.mutate(
        submitData
      );
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/templates"
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
          Şablonlar
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
              bg-indigo-50
              text-indigo-600
              dark:bg-indigo-500/[0.08]
              dark:text-indigo-400
            "
          >
            <FileText size={21} />
          </div>

          <div>

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              Yeni Şablon
            </h1>

            <p
              className="
                mt-1
                max-w-2xl
                text-sm
                leading-6
                text-gray-500
                dark:text-slate-400
              "
            >
              Büro içerisinde tekrar kullanılacak dilekçe, ihtar veya sözleşme şablonunu tanımlayın.
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

        {/* TEMPLATE INFORMATION */}

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
                  Şablonun adı, açıklaması ve sınıflandırması
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
              placeholder="Örn: İcra Takibi İtiraz Dilekçesi"
              autoFocus
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
                rows={4}
                placeholder="Şablonun hangi işlemlerde kullanılacağını kısaca açıklayın..."
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
                  transition
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CATEGORY */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Kategori *
                </label>

                <select
                  name="category"
                  value={
                    formData.category
                  }
                  onChange={
                    handleChange
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
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {CATEGORY_OPTIONS.map(
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

              {/* LAW AREA */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Hukuk Alanı *
                </label>

                <select
                  name="law_area"
                  value={
                    formData.law_area
                  }
                  onChange={
                    handleChange
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
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {LAW_AREA_OPTIONS.map(
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

            </div>

          </Card.Body>

        </Card>

        {/* FILE */}

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
                <FileUp size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Şablon Dosyası
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Kullanıcıların daha sonra indireceği ana şablon dosyası
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                !file &&
                fileInputRef.current?.click()
              }
              onKeyDown={(
                event
              ) => {
                if (
                  !file &&
                  (
                    event.key ===
                      'Enter' ||
                    event.key ===
                      ' '
                  )
                ) {
                  event.preventDefault();

                  fileInputRef.current?.click();
                }
              }}
              onDragOver={
                handleDragOver
              }
              onDragLeave={
                handleDragLeave
              }
              onDrop={
                handleDrop
              }
              className={`
                rounded-xl
                border-2
                border-dashed
                p-6
                transition
                ${
                  file
                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/[0.025]'
                    : fileError ||
                        errors.file
                      ? 'border-red-300 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/[0.025]'
                      : isDragging
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/[0.05]'
                        : 'cursor-pointer border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30 dark:border-white/[0.08] dark:bg-white/[0.015] dark:hover:border-blue-500/40 dark:hover:bg-blue-500/[0.025]'
                }
              `}
            >

              {file ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-100
                        text-emerald-600
                        dark:bg-emerald-500/[0.1]
                        dark:text-emerald-400
                      "
                    >
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <p
                          className="max-w-md truncate text-sm font-semibold text-gray-900 dark:text-white"
                          title={
                            file.name
                          }
                        >
                          {file.name}
                        </p>

                        <Badge
                          variant="success"
                          dot
                        >
                          Dosya hazır
                        </Badge>

                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-500">

                        <span>
                          {getFileTypeLabel(
                            file
                          )}
                        </span>

                        <span>
                          ·
                        </span>

                        <span>
                          {formatFileSize(
                            file.size
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      handleRemoveFile();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Dosyayı Kaldır
                  </Button>

                </div>
              ) : (
                <div className="py-4 text-center">

                  <div
                    className="
                      mx-auto
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-50
                      text-blue-600
                      dark:bg-blue-500/[0.08]
                      dark:text-blue-400
                    "
                  >
                    <UploadCloud size={22} />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Dosyayı buraya sürükleyin
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                    veya bilgisayarınızdan seçmek için tıklayın
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">

                    <Badge variant="default">
                      PDF
                    </Badge>

                    <Badge variant="default">
                      Word
                    </Badge>

                    <Badge variant="default">
                      Excel
                    </Badge>

                    <Badge variant="default">
                      Görsel
                    </Badge>

                    <Badge variant="default">
                      UYAP UDF
                    </Badge>

                    <Badge variant="default">
                      TXT
                    </Badge>

                    <Badge variant="default">
                      En fazla 10 MB
                    </Badge>

                  </div>

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
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.udf"
              />

            </div>

            {(fileError ||
              errors.file) && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {fileError ||
                  errors.file}
              </p>
            )}

            {file &&
              !fileError && (
                <div
                  className="
                    mt-4
                    flex
                    items-start
                    gap-2
                    rounded-lg
                    bg-emerald-50
                    px-3
                    py-2
                    text-xs
                    text-emerald-700
                    dark:bg-emerald-500/[0.05]
                    dark:text-emerald-400
                  "
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                  Dosya doğrulandı ve yüklemeye hazır.
                </div>
              )}

          </Card.Body>

        </Card>

        {/* SUMMARY */}

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
                <Scale size={17} />
              </div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Kayıt Özeti
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-3 sm:grid-cols-3">

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-3
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Kategori
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {CATEGORY_OPTIONS.find(
                    (
                      option
                    ) =>
                      option.value ===
                      formData.category
                  )?.label ||
                    '-'}
                </p>

              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-3
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Hukuk Alanı
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {LAW_AREA_OPTIONS.find(
                    (
                      option
                    ) =>
                      option.value ===
                      formData.law_area
                  )?.label ||
                    '-'}
                </p>

              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50/50
                  p-3
                  dark:border-white/[0.05]
                  dark:bg-white/[0.02]
                "
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-600">
                  Dosya
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-gray-700 dark:text-slate-300">
                  {file
                    ? getFileTypeLabel(
                        file
                      )
                    : 'Seçilmedi'}
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ACTIONS */}

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
                '/templates'
              )
            }
            disabled={
              mutation.isPending
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
          >
            <Plus className="h-4 w-4" />
            Şablon Oluştur
          </Button>

        </div>

      </form>

    </div>
  );
};

export default TemplateCreate;