import {
  useEffect,
  useState,
} from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import userApi from '../../features/users/user.api.js';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const ROLE_OPTIONS = [
  {
    value: '',
    label: 'Tüm Roller',
  },
  {
    value: 'admin',
    label: 'Yönetici',
  },
  {
    value: 'lawyer',
    label: 'Avukat',
  },
  {
    value: 'intern',
    label: 'Stajyer',
  },
  {
    value: 'secretary',
    label: 'Sekreter',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getRoleLabel = (
  role
) => {
  const roles = {
    admin: 'Yönetici',
    lawyer: 'Avukat',
    intern: 'Stajyer',
    secretary: 'Sekreter',
  };

  return (
    roles[role] ||
    role ||
    '-'
  );
};

const getRoleVariant = (
  role
) => {
  const variants = {
    admin: 'danger',
    lawyer: 'success',
    intern: 'warning',
    secretary: 'info',
  };

  return (
    variants[role] ||
    'default'
  );
};

const formatDate = (
  date
) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

const getFullName = (
  user
) => {
  return [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'İsimsiz Kullanıcı';
};

// ======================================================
// COMPONENT
// ======================================================

const UserList = () => {
  const queryClient =
    useQueryClient();

  const [
    filters,
    setFilters,
  ] =
    useState({
      role: '',
      search: '',
    });

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    editingUser,
    setEditingUser,
  ] =
    useState(null);

  const [
    isModalOpen,
    setIsModalOpen,
  ] =
    useState(false);

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } =
    useQuery({
      queryKey: [
        'users',
        {
          ...filters,
          page,
        },
      ],

      queryFn: () =>
        userApi.getAll({
          ...filters,
          page,
          limit: 20,
        }),
    });

  const users =
    Array.isArray(
      data?.data?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data
      ?.pagination;

  // ====================================================
  // RESET PAGE
  // ====================================================

  useEffect(() => {
    setPage(1);
  }, [
    filters.role,
    filters.search,
  ]);

  // ====================================================
  // UPDATE
  // ====================================================

  const updateMutation =
    useMutation({
      mutationFn: ({
        id,
        data,
      }) =>
        userApi.update(
          id,
          data
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['users'],
        });

        toast.success(
          'Kullanıcı güncellendi'
        );

        setIsModalOpen(
          false
        );

        setEditingUser(
          null
        );
      },

      onError: (
        requestError
      ) => {
        toast.error(
          requestError
            ?.response
            ?.data
            ?.message ||
            'Güncelleme başarısız'
        );
      },
    });

  // ====================================================
  // DELETE
  // ====================================================

  const deleteMutation =
    useMutation({
      mutationFn: (
        id
      ) =>
        userApi.delete(
          id
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['users'],
        });

        toast.success(
          'Kullanıcı silindi'
        );
      },

      onError: (
        requestError
      ) => {
        toast.error(
          requestError
            ?.response
            ?.data
            ?.message ||
            'Silme başarısız'
        );
      },
    });

  // ====================================================
  // HANDLERS
  // ====================================================

  const updateFilter = (
    name,
    value
  ) => {
    setFilters(
      (
        current
      ) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const resetFilters =
    () => {
      setFilters({
        role: '',
        search: '',
      });

      setPage(1);
    };

  const hasFilters =
    Boolean(
      filters.role ||
      filters.search
    );

  const handleDelete = (
    user
  ) => {
    const name =
      getFullName(
        user
      );

    const confirmed =
      window.confirm(
        `"${name}" kullanıcısını silmek istediğinize emin misiniz?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    deleteMutation.mutate(
      user.id
    );
  };

  const handleEdit = (
    user
  ) => {
    setEditingUser(
      user
    );

    setIsModalOpen(
      true
    );
  };

  const closeModal =
    () => {
      setIsModalOpen(
        false
      );

      setEditingUser(
        null
      );
    };

  const handleUpdate = (
    event
  ) => {
    event.preventDefault();

    if (
      !editingUser?.id
    ) {
      return;
    }

    const formData =
      new FormData(
        event.currentTarget
      );

    const updateData = {
      first_name:
        formData.get(
          'first_name'
        ),

      last_name:
        formData.get(
          'last_name'
        ),

      email:
        formData.get(
          'email'
        ),

      role:
        formData.get(
          'role'
        ),

      is_active:
        formData.get(
          'is_active'
        ) === 'true',
    };

    updateMutation.mutate({
      id:
        editingUser.id,

      data:
        updateData,
    });
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Kullanıcılar yükleniyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error
  ) {
    return (
      <Error
        title="Kullanıcılar yüklenemedi"
        message="Kullanıcı kayıtları alınırken bir hata oluştu."
        error={error}
        onRetry={() =>
          refetch?.()
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-violet-50
              text-violet-600
              dark:bg-violet-500/[0.08]
              dark:text-violet-400
            "
          >
            <ShieldCheck size={21} />
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
              Kullanıcılar
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
              Sistem kullanıcılarını, rollerini ve hesap durumlarını yönetin.
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Toplam{' '}
              <span className="font-semibold text-gray-600 dark:text-slate-300">
                {pagination?.total ||
                  0}
              </span>{' '}
              kullanıcı
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 sm:flex-row">

            <div className="relative flex-1">

              <Search
                size={16}
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  dark:text-slate-500
                "
              />

              <input
                type="search"
                value={
                  filters.search
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'search',
                    event.target.value
                  )
                }
                placeholder="Ad, soyad veya e-posta ara..."
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  pl-10
                  pr-3.5
                  text-sm
                  text-gray-900
                  shadow-sm
                  outline-none
                  transition
                  placeholder:text-gray-400
                  hover:border-gray-300
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

            <div className="min-w-[200px]">

              <select
                value={
                  filters.role
                }
                onChange={(
                  event
                ) =>
                  updateFilter(
                    'role',
                    event.target.value
                  )
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
                  shadow-sm
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
              >
                {ROLE_OPTIONS.map(
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

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={
                  resetFilters
                }
              >
                <X className="h-4 w-4" />
                Temizle
              </Button>
            )}

          </div>

          {isFetching && (
            <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
              Liste güncelleniyor...
            </p>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          EMPTY / TABLE
      ================================================== */}

      {users.length ===
      0 ? (
        <Empty
          icon={Users}
          title={
            hasFilters
              ? 'Eşleşen kullanıcı bulunamadı'
              : 'Kullanıcı bulunamadı'
          }
          description={
            hasFilters
              ? 'Arama veya rol filtresini değiştirerek tekrar deneyin.'
              : 'Sistemde görüntülenecek kullanıcı kaydı bulunmuyor.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={
                  resetFilters
                }
              >
                Filtreleri Temizle
              </Button>
            ) : null
          }
        />
      ) : (
        <>

          <Table>

            <Table.Head>

              <Table.Row hover={false}>

                <Table.HeadCell>
                  Kullanıcı
                </Table.HeadCell>

                <Table.HeadCell>
                  E-posta
                </Table.HeadCell>

                <Table.HeadCell>
                  Rol
                </Table.HeadCell>

                <Table.HeadCell>
                  Durum
                </Table.HeadCell>

                <Table.HeadCell>
                  Son Giriş
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {users.map(
                (
                  item
                ) => (
                  <Table.Row
                    key={
                      item.id
                    }
                  >

                    {/* USER */}

                    <Table.Cell>

                      <div className="flex min-w-[180px] items-center gap-3">

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-blue-50
                            text-xs
                            font-semibold
                            text-blue-600
                            dark:bg-blue-500/[0.08]
                            dark:text-blue-400
                          "
                        >
                          {item.first_name?.[0] || ''}
                          {item.last_name?.[0] || ''}
                        </div>

                        <div>

                          <p className="font-semibold text-gray-900 dark:text-white">
                            {getFullName(
                              item
                            )}
                          </p>

                          <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                            ID: {String(
                              item.id
                            ).slice(
                              0,
                              8
                            )}
                          </p>

                        </div>

                      </div>

                    </Table.Cell>

                    {/* EMAIL */}

                    <Table.Cell>

                      <span
                        className="
                          block
                          max-w-[240px]
                          truncate
                          text-sm
                          text-gray-600
                          dark:text-slate-400
                        "
                        title={
                          item.email
                        }
                      >
                        {item.email ||
                          '-'}
                      </span>

                    </Table.Cell>

                    {/* ROLE */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getRoleVariant(
                            item.role
                          )
                        }
                        dot
                      >
                        {getRoleLabel(
                          item.role
                        )}
                      </Badge>

                    </Table.Cell>

                    {/* STATUS */}

                    <Table.Cell>

                      <Badge
                        variant={
                          item.is_active
                            ? 'success'
                            : 'danger'
                        }
                        dot
                      >
                        {item.is_active
                          ? 'Aktif'
                          : 'Pasif'}
                      </Badge>

                    </Table.Cell>

                    {/* LAST LOGIN */}

                    <Table.Cell>

                      <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-500">
                        {formatDate(
                          item.last_login
                        )}
                      </span>

                    </Table.Cell>

                    {/* ACTIONS */}

                    <Table.Cell className="text-right">

                      <div className="flex items-center justify-end gap-1">

                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              item
                            )
                          }
                          className="
                            inline-flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-blue-50
                            hover:text-blue-600
                            dark:text-slate-500
                            dark:hover:bg-blue-500/[0.08]
                            dark:hover:text-blue-400
                          "
                          title="Kullanıcıyı düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              item
                            )
                          }
                          disabled={
                            deleteMutation.isPending
                          }
                          className="
                            inline-flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-red-50
                            hover:text-red-600
                            disabled:opacity-50
                            dark:text-slate-500
                            dark:hover:bg-red-500/[0.08]
                            dark:hover:text-red-400
                          "
                          title="Kullanıcıyı sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>

                    </Table.Cell>

                  </Table.Row>
                )
              )}

            </Table.Body>

          </Table>

          {/* ==================================================
              PAGINATION
          ================================================== */}

          {pagination &&
            pagination.totalPages >
              1 && (
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  py-3
                  dark:border-white/[0.07]
                  dark:bg-[#0b1b33]
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Toplam{' '}
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    {pagination.total}
                  </span>{' '}
                  kullanıcı
                </p>

                <div className="flex items-center gap-2">

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      page <= 1 ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Önceki
                  </Button>

                  <span className="min-w-[70px] text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                    {page} /{' '}
                    {pagination.totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={
                      page >=
                        pagination.totalPages ||
                      isFetching
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            pagination.totalPages,
                            current + 1
                          )
                      )
                    }
                  >
                    Sonraki
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                </div>

              </div>
            )}

        </>
      )}

      {/* ==================================================
          EDIT MODAL
      ================================================== */}

      <Modal
        isOpen={
          isModalOpen
        }
        onClose={
          closeModal
        }
        title="Kullanıcı Düzenle"
        size="md"
      >

        {editingUser && (
          <form
            onSubmit={
              handleUpdate
            }
            className="space-y-5"
          >

            <div
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-gray-100
                bg-gray-50
                p-3
                dark:border-white/[0.05]
                dark:bg-white/[0.025]
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-100
                  text-sm
                  font-bold
                  text-blue-700
                  dark:bg-blue-500/[0.1]
                  dark:text-blue-400
                "
              >
                {editingUser.first_name?.[0] || ''}
                {editingUser.last_name?.[0] || ''}
              </div>

              <div>

                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getFullName(
                    editingUser
                  )}
                </p>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                  Kullanıcı hesabı ve yetki bilgilerini düzenleyin.
                </p>

              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <Input
                label="Ad"
                name="first_name"
                defaultValue={
                  editingUser.first_name
                }
                required
              />

              <Input
                label="Soyad"
                name="last_name"
                defaultValue={
                  editingUser.last_name
                }
                required
              />

            </div>

            <Input
              label="E-posta"
              name="email"
              type="email"
              defaultValue={
                editingUser.email
              }
              required
            />

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Rol
              </label>

              <select
                name="role"
                defaultValue={
                  editingUser.role
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
                <option value="admin">
                  Yönetici
                </option>

                <option value="lawyer">
                  Avukat
                </option>

                <option value="intern">
                  Stajyer
                </option>

                <option value="secretary">
                  Sekreter
                </option>
              </select>

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Hesap Durumu
              </label>

              <select
                name="is_active"
                defaultValue={
                  editingUser.is_active
                    ? 'true'
                    : 'false'
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
                <option value="true">
                  Aktif
                </option>

                <option value="false">
                  Pasif
                </option>
              </select>

            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06]">

              <Button
                type="button"
                variant="secondary"
                onClick={
                  closeModal
                }
              >
                İptal
              </Button>

              <Button
                type="submit"
                loading={
                  updateMutation.isPending
                }
              >
                Güncelle
              </Button>

            </div>

          </form>
        )}

      </Modal>

    </div>
  );
};

export default UserList;