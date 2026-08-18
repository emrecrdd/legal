  import {
    useEffect,
    useMemo,
    useState,
  } from 'react';

  import {
    Link,
  } from 'react-router-dom';

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
    KeyRound,
    Pencil,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    UserPlus,
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

  const LAWYER_PRESETS = [
    {
      value: '',
      label: 'Yetki şablonu seçin',
    },
    {
      value: 'STANDARD_LAWYER',
      label: 'Standart Avukat',
    },
    {
      value: 'SENIOR_LAWYER',
      label: 'Kıdemli Avukat',
    },
    {
      value: 'MANAGING_LAWYER',
      label: 'Yönetici Avukat',
    },
  ];

  // ======================================================
  // PERMISSION UI GROUPS
  // ======================================================

  const PERMISSION_GROUPS = [
    {
      key: 'clients',
      label: 'Müvekkiller',
      keywords: [
        'clients',
      ],
    },
    {
      key: 'cases',
      label: 'Davalar',
      keywords: [
        'cases',
        'case_status',
        'case_parties',
      ],
    },
    {
      key: 'documents',
      label: 'Belgeler',
      keywords: [
        'documents',
        'document_versions',
      ],
    },
    {
      key: 'tasks',
      label: 'Görevler',
      keywords: [
        'tasks',
      ],
    },
    {
      key: 'calendar',
      label: 'Takvim ve Etkinlikler',
      keywords: [
        'events',
        'calendar',
      ],
    },
    {
      key: 'meetings',
      label: 'Toplantılar',
      keywords: [
        'meetings',
      ],
    },
    {
      key: 'finance',
      label: 'Finans',
      keywords: [
        'payments',
        'finance',
        'payment_plans',
      ],
    },
    {
      key: 'notes',
      label: 'Notlar',
      keywords: [
        'notes',
      ],
    },
    {
      key: 'power-of-attorney',
      label: 'Vekaletnameler',
      keywords: [
        'power_of_attorney',
      ],
    },
    {
      key: 'templates',
      label: 'Şablonlar',
      keywords: [
        'templates',
      ],
    },
    {
      key: 'administration',
      label: 'Yönetim',
      keywords: [
        'users',
        'user_roles',
        'user_status',
        'permissions',
        'audit_logs',
      ],
    },
    {
      key: 'system',
      label: 'Sistem',
      keywords: [
        'search',
        'ai',
        'settings',
      ],
    },
  ];

  // ======================================================
  // PERMISSION LABELS
  // ======================================================

  const PERMISSION_LABELS = {
    view_clients:
      'Müvekkilleri görüntüle',

    create_clients:
      'Müvekkil oluştur',

    edit_clients:
      'Müvekkil düzenle',

    delete_clients:
      'Müvekkil sil',

    view_cases:
      'Davaları görüntüle',

    create_cases:
      'Dava oluştur',

    edit_cases:
      'Dava düzenle',

    delete_cases:
      'Dava sil',

    change_case_status:
      'Dava durumunu değiştir',

    manage_case_parties:
      'Dava taraflarını yönet',

    view_documents:
      'Belgeleri görüntüle',

    upload_documents:
      'Belge yükle',

    edit_documents:
      'Belge düzenle',

    delete_documents:
      'Belge sil',

    download_documents:
      'Belge indir',

    manage_document_versions:
      'Belge versiyonlarını yönet',

    view_tasks:
      'Görevleri görüntüle',

    create_tasks:
      'Görev oluştur',

    edit_tasks:
      'Görev düzenle',

    delete_tasks:
      'Görev sil',

    assign_tasks:
      'Görev ata',

    work_on_tasks:
      'Görev üzerinde çalış',

    approve_tasks:
      'Görev onayla',

    view_all_tasks:
      'Tüm görevleri görüntüle',

    view_events:
      'Etkinlikleri görüntüle',

    create_events:
      'Etkinlik oluştur',

    edit_events:
      'Etkinlik düzenle',

    delete_events:
      'Etkinlik sil',

    view_calendar:
      'Takvimi görüntüle',

    manage_calendar:
      'Takvimi yönet',

    view_meetings:
      'Toplantıları görüntüle',

    create_meetings:
      'Toplantı oluştur',

    edit_meetings:
      'Toplantı düzenle',

    delete_meetings:
      'Toplantı sil',

    view_payments:
      'Finans kayıtlarını görüntüle',

    create_payments:
      'Ödeme oluştur',

    edit_payments:
      'Ödeme düzenle',

    delete_payments:
      'Ödeme sil',

    reverse_payments:
      'Ödeme ters kaydı oluştur',

    view_finance_reports:
      'Finans raporlarını görüntüle',

    manage_payment_plans:
      'Ödeme planlarını yönet',

    view_notes:
      'Notları görüntüle',

    create_notes:
      'Not oluştur',

    edit_notes:
      'Not düzenle',

    delete_notes:
      'Not sil',

    view_power_of_attorney:
      'Vekaletnameleri görüntüle',

    create_power_of_attorney:
      'Vekaletname oluştur',

    edit_power_of_attorney:
      'Vekaletname düzenle',

    delete_power_of_attorney:
      'Vekaletname sil',

    view_templates:
      'Şablonları görüntüle',

    create_templates:
      'Şablon oluştur',

    edit_templates:
      'Şablon düzenle',

    delete_templates:
      'Şablon sil',

    use_search:
      'Gelişmiş arama kullan',

    use_ai:
      'Yapay zeka özelliklerini kullan',

    view_users:
      'Kullanıcıları görüntüle',

    create_users:
      'Kullanıcı oluştur',

    edit_users:
      'Kullanıcı düzenle',

    delete_users:
      'Kullanıcı sil',

    change_user_roles:
      'Kullanıcı rollerini değiştir',

    manage_user_status:
      'Kullanıcı durumunu yönet',

    manage_permissions:
      'Kullanıcı yetkilerini yönet',

    view_audit_logs:
      'Denetim kayıtlarını görüntüle',

    view_settings:
      'Ayarları görüntüle',

    manage_settings:
      'Sistem ayarlarını yönet',
  };

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
        new Date(
          date
        );

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
      ).format(
        parsed
      );
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
      .filter(
        Boolean
      )
      .join(' ')
      .trim() ||
      'İsimsiz Kullanıcı';
  };

  const formatPermissionLabel = (
    permission
  ) => {
    if (
      PERMISSION_LABELS[
        permission
      ]
    ) {
      return PERMISSION_LABELS[
        permission
      ];
    }

    return String(
      permission
    )
      .replaceAll(
        '_',
        ' '
      )
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );
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

    // ====================================================
    // EDIT USER
    // ====================================================

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
    // PERMISSIONS
    // ====================================================

    const [
      permissionUser,
      setPermissionUser,
    ] =
      useState(null);

    const [
      isPermissionModalOpen,
      setIsPermissionModalOpen,
    ] =
      useState(false);

    const [
      permissionOverrides,
      setPermissionOverrides,
    ] =
      useState({});

    const [
      selectedPreset,
      setSelectedPreset,
    ] =
      useState('');

    // ====================================================
    // USER QUERY
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
    // PERMISSION QUERY
    // ====================================================

    const {
      data:
        permissionResponse,

      isLoading:
        isPermissionsLoading,

      isFetching:
        isPermissionsFetching,

      error:
        permissionsError,

      refetch:
        refetchPermissions,
    } =
      useQuery({
        queryKey: [
          'user-permissions',
          permissionUser?.id,
        ],

        queryFn: () =>
          userApi.getPermissions(
            permissionUser.id
          ),

        enabled:
          Boolean(
            permissionUser?.id &&
            isPermissionModalOpen
          ),
      });

    const permissionData =
      permissionResponse
        ?.data
        ?.data;

    const allPermissions =
      Array.isArray(
        permissionData
          ?.all_permissions
      )
        ? permissionData
            .all_permissions
        : [];

    const effectivePermissions =
      Array.isArray(
        permissionData
          ?.effective_permissions
      )
        ? permissionData
            .effective_permissions
        : [];

    // ====================================================
    // GROUPED PERMISSIONS
    // ====================================================

    const groupedPermissions =
      useMemo(() => {
        const assigned =
          new Set();

        const groups =
          PERMISSION_GROUPS.map(
            (
              group
            ) => {
              const permissions =
                allPermissions.filter(
                  (
                    permission
                  ) => {
                    const matched =
                      group.keywords.some(
                        (
                          keyword
                        ) =>
                          permission.includes(
                            keyword
                          )
                      );

                    if (
                      matched
                    ) {
                      assigned.add(
                        permission
                      );
                    }

                    return matched;
                  }
                );

              return {
                ...group,
                permissions,
              };
            }
          ).filter(
            (
              group
            ) =>
              group.permissions
                .length > 0
          );

        const others =
          allPermissions.filter(
            (
              permission
            ) =>
              !assigned.has(
                permission
              )
          );

        if (
          others.length >
          0
        ) {
          groups.push({
            key:
              'other',

            label:
              'Diğer Yetkiler',

            permissions:
              others,
          });
        }

        return groups;
      }, [
        allPermissions,
      ]);

    // ====================================================
    // RESET PAGE
    // ====================================================

    useEffect(() => {
      setPage(
        1
      );
    }, [
      filters.role,
      filters.search,
    ]);

    // ====================================================
    // SYNC PERMISSIONS
    // ====================================================

    useEffect(() => {
      if (
        !permissionData
      ) {
        return;
      }

      const overrides =
        permissionData
          .overrides;

      if (
        overrides &&
        typeof overrides ===
          'object' &&
        !Array.isArray(
          overrides
        )
      ) {
        setPermissionOverrides({
          ...overrides,
        });
      } else {
        setPermissionOverrides(
          {}
        );
      }
    }, [
      permissionData,
    ]);

    // ====================================================
    // PROFILE UPDATE
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

        onError: (
          requestError
        ) => {
          toast.error(
            requestError
              ?.response
              ?.data
              ?.message ||
              'Kullanıcı bilgileri güncellenemedi'
          );
        },
      });

    // ====================================================
    // ROLE UPDATE
    // ====================================================

    const roleMutation =
      useMutation({
        mutationFn: ({
          id,
          role,
        }) =>
          userApi.changeRole(
            id,
            role
          ),

        onError: (
          requestError
        ) => {
          toast.error(
            requestError
              ?.response
              ?.data
              ?.message ||
              'Kullanıcı rolü değiştirilemedi'
          );
        },
      });

    // ====================================================
    // ACTIVE STATUS
    // ====================================================

    const activeMutation =
      useMutation({
        mutationFn: (
          id
        ) =>
          userApi.toggleActive(
            id
          ),

        onError: (
          requestError
        ) => {
          toast.error(
            requestError
              ?.response
              ?.data
              ?.message ||
              'Hesap durumu değiştirilemedi'
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

        onSuccess:
          async () => {
            await queryClient.invalidateQueries({
              queryKey: [
                'users',
              ],
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
    // UPDATE PERMISSIONS
    // ====================================================

    const permissionMutation =
      useMutation({
        mutationFn: ({
          id,
          permissions,
        }) =>
          userApi.updatePermissions(
            id,
            permissions
          ),

        onSuccess:
          async () => {
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: [
                  'users',
                ],
              }),

              queryClient.invalidateQueries({
                queryKey: [
                  'user-permissions',
                  permissionUser?.id,
                ],
              }),
            ]);

            toast.success(
              'Kullanıcı yetkileri güncellendi'
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
              'Yetkiler güncellenemedi'
          );
        },
      });

    // ====================================================
    // RESET PERMISSIONS
    // ====================================================

    const resetPermissionMutation =
      useMutation({
        mutationFn: (
          id
        ) =>
          userApi.resetPermissions(
            id
          ),

        onSuccess:
          async () => {
            setPermissionOverrides(
              {}
            );

            setSelectedPreset(
              ''
            );

            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: [
                  'users',
                ],
              }),

              queryClient.invalidateQueries({
                queryKey: [
                  'user-permissions',
                  permissionUser?.id,
                ],
              }),
            ]);

            toast.success(
              'Kullanıcı rol varsayılanlarına döndürüldü'
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
              'Yetkiler sıfırlanamadı'
          );
        },
      });

    // ====================================================
    // PRESET
    // ====================================================

    const presetMutation =
      useMutation({
        mutationFn: ({
          id,
          preset,
        }) =>
          userApi.applyPermissionPreset(
            id,
            preset
          ),

        onSuccess:
          async () => {
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: [
                  'users',
                ],
              }),

              queryClient.invalidateQueries({
                queryKey: [
                  'user-permissions',
                  permissionUser?.id,
                ],
              }),
            ]);

            toast.success(
              'Yetki şablonu uygulandı'
            );

            setSelectedPreset(
              ''
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
              'Yetki şablonu uygulanamadı'
          );
        },
      });

    // ====================================================
    // DERIVED
    // ====================================================

    const isUpdating =
      updateMutation.isPending ||
      roleMutation.isPending ||
      activeMutation.isPending;

    const isPermissionUpdating =
      permissionMutation.isPending ||
      resetPermissionMutation.isPending ||
      presetMutation.isPending;

    // ====================================================
    // FILTER HANDLERS
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
          [name]:
            value,
        })
      );
    };

    const resetFilters =
      () => {
        setFilters({
          role: '',
          search: '',
        });

        setPage(
          1
        );
      };

    const hasFilters =
      Boolean(
        filters.role ||
        filters.search
      );

    // ====================================================
    // DELETE
    // ====================================================

    const handleDelete = (
      user
    ) => {
      const name =
        getFullName(
          user
        );

      const confirmed =
        window.confirm(
          `"${name}" kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
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

    // ====================================================
    // EDIT MODAL
    // ====================================================

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
        if (
          isUpdating
        ) {
          return;
        }

        setIsModalOpen(
          false
        );

        setEditingUser(
          null
        );
      };

    // ====================================================
    // PERMISSION MODAL
    // ====================================================

    const handlePermissions = (
      user
    ) => {
      setPermissionUser(
        user
      );

      setPermissionOverrides(
        {}
      );

      setSelectedPreset(
        ''
      );

      setIsPermissionModalOpen(
        true
      );
    };

    const closePermissionModal =
      () => {
        if (
          isPermissionUpdating
        ) {
          return;
        }

        setIsPermissionModalOpen(
          false
        );

        setPermissionUser(
          null
        );

        setPermissionOverrides(
          {}
        );

        setSelectedPreset(
          ''
        );
      };

    // ====================================================
    // PERMISSION CHANGE
    // ====================================================

    const handlePermissionChange = (
      permission,
      mode
    ) => {
      setPermissionOverrides(
        (
          current
        ) => {
          const next = {
            ...current,
          };

          if (
            mode ===
            'default'
          ) {
            delete next[
              permission
            ];

            return next;
          }

          next[
            permission
          ] =
            mode ===
            'allow';

          return next;
        }
      );
    };

    const handleSavePermissions =
      async () => {
        if (
          !permissionUser?.id ||
          isPermissionUpdating
        ) {
          return;
        }

        try {
          await permissionMutation.mutateAsync({
            id:
              permissionUser.id,

            permissions:
              permissionOverrides,
          });

          await refetchPermissions?.();
        } catch {
          // Mutation onError mesajı gösteriyor.
        }
      };

    const handleResetPermissions =
      async () => {
        if (
          !permissionUser?.id ||
          isPermissionUpdating
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            'Bu kullanıcının tüm özel yetkileri kaldırılacak ve rol varsayılanlarına dönülecek. Devam edilsin mi?'
          );

        if (
          !confirmed
        ) {
          return;
        }

        try {
          await resetPermissionMutation.mutateAsync(
            permissionUser.id
          );

          await refetchPermissions?.();
        } catch {
          // Mutation onError mesajı gösteriyor.
        }
      };

    const handleApplyPreset =
      async () => {
        if (
          !permissionUser?.id ||
          !selectedPreset ||
          isPermissionUpdating
        ) {
          return;
        }

        try {
          await presetMutation.mutateAsync({
            id:
              permissionUser.id,

            preset:
              selectedPreset,
          });

          await refetchPermissions?.();
        } catch {
          // Mutation onError mesajı gösteriyor.
        }
      };

    // ====================================================
    // UPDATE USER
    // ====================================================

    const handleUpdate =
      async (
        event
      ) => {
        event.preventDefault();

        if (
          !editingUser?.id ||
          isUpdating
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget
          );

        const firstName =
          String(
            formData.get(
              'first_name'
            ) || ''
          ).trim();

        const lastName =
          String(
            formData.get(
              'last_name'
            ) || ''
          ).trim();

        const email =
          String(
            formData.get(
              'email'
            ) || ''
          )
            .trim()
            .toLowerCase();

        const role =
          String(
            formData.get(
              'role'
            ) || ''
          );

        const requestedActive =
          formData.get(
            'is_active'
          ) === 'true';

        if (
          !firstName
        ) {
          toast.error(
            'Ad gereklidir'
          );

          return;
        }

        if (
          !lastName
        ) {
          toast.error(
            'Soyad gereklidir'
          );

          return;
        }

        if (
          !email
        ) {
          toast.error(
            'E-posta adresi gereklidir'
          );

          return;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
          )
        ) {
          toast.error(
            'Geçerli bir e-posta adresi girin'
          );

          return;
        }

        try {
          const profileChanged =
            firstName !==
              editingUser.first_name ||
            lastName !==
              editingUser.last_name ||
            email !==
              String(
                editingUser.email ||
                ''
              )
                .trim()
                .toLowerCase();

          if (
            profileChanged
          ) {
            await updateMutation.mutateAsync({
              id:
                editingUser.id,

              data: {
                first_name:
                  firstName,

                last_name:
                  lastName,

                email,
              },
            });
          }

          if (
            role !==
            editingUser.role
          ) {
            await roleMutation.mutateAsync({
              id:
                editingUser.id,

              role,
            });
          }

          if (
            requestedActive !==
            Boolean(
              editingUser.is_active
            )
          ) {
            await activeMutation.mutateAsync(
              editingUser.id
            );
          }

          await queryClient.invalidateQueries({
            queryKey: [
              'users',
            ],
          });

          toast.success(
            'Kullanıcı başarıyla güncellendi'
          );

          setIsModalOpen(
            false
          );

          setEditingUser(
            null
          );
        } catch {
          // Mutation hata mesajlarını gösteriyor.
        }
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
          error={
            error
          }
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
                Sistem kullanıcılarını, rollerini, hesap durumlarını ve özel erişim yetkilerini yönetin.
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

          <Link
            to="/users/create"
            className="shrink-0"
          >
            <Button>
              <UserPlus className="h-4 w-4" />
              Yeni Kullanıcı
            </Button>
          </Link>

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
            icon={
              Users
            }
            title={
              hasFilters
                ? 'Eşleşen kullanıcı bulunamadı'
                : 'Kullanıcı bulunamadı'
            }
            description={
              hasFilters
                ? 'Arama veya rol filtresini değiştirerek tekrar deneyin.'
                : 'Henüz kullanıcı kaydı bulunmuyor.'
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
              ) : (
                <Link
                  to="/users/create"
                >
                  <Button>
                    <UserPlus className="h-4 w-4" />
                    İlk Kullanıcıyı Ekle
                  </Button>
                </Link>
              )
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
                              ID:{' '}
                              {String(
                                item.id
                              ).slice(
                                0,
                                8
                              )}
                            </p>

                          </div>

                        </div>

                      </Table.Cell>

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

                      <Table.Cell>

                        <span className="whitespace-nowrap text-xs text-gray-500 dark:text-slate-500">
                          {formatDate(
                            item.last_login
                          )}
                        </span>

                      </Table.Cell>

                      <Table.Cell className="text-right">

                        <div className="flex items-center justify-end gap-1">

                          {item.role !==
                            'admin' && (
                            <button
                              type="button"
                              onClick={() =>
                                handlePermissions(
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
                                hover:bg-violet-50
                                hover:text-violet-600
                                dark:text-slate-500
                                dark:hover:bg-violet-500/[0.08]
                                dark:hover:text-violet-400
                              "
                              title="Yetkileri yönet"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                item
                              )
                            }
                            disabled={
                              isUpdating
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
                              disabled:cursor-not-allowed
                              disabled:opacity-50
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
                              disabled:cursor-not-allowed
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
                              current -
                                1
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
                              current +
                                1
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
          closeOnBackdrop={
            !isUpdating
          }
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
                    Profil, rol ve hesap durumunu yönetin.
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
                  disabled={
                    isUpdating
                  }
                  required
                />

                <Input
                  label="Soyad"
                  name="last_name"
                  defaultValue={
                    editingUser.last_name
                  }
                  disabled={
                    isUpdating
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
                disabled={
                  isUpdating
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
                  disabled={
                    isUpdating
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
                    transition
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
                  disabled={
                    isUpdating
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
                    transition
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
                  disabled={
                    isUpdating
                  }
                >
                  İptal
                </Button>

                <Button
                  type="submit"
                  loading={
                    isUpdating
                  }
                  disabled={
                    isUpdating
                  }
                >
                  Güncelle
                </Button>

              </div>

            </form>
          )}

        </Modal>

        {/* ==================================================
            PERMISSION MODAL
        ================================================== */}

        <Modal
          isOpen={
            isPermissionModalOpen
          }
          onClose={
            closePermissionModal
          }
          title="Kullanıcı Yetkileri"
          size="xl"
          closeOnBackdrop={
            !isPermissionUpdating
          }
        >

          {permissionUser && (
            <div className="space-y-5">

              {/* USER */}

              <div
                className="
                  flex
                  flex-col
                  gap-4
                  rounded-xl
                  border
                  border-gray-200
                  bg-gray-50/70
                  p-4
                  dark:border-white/[0.06]
                  dark:bg-white/[0.025]
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-full
                      bg-violet-100
                      font-semibold
                      text-violet-700
                      dark:bg-violet-500/[0.1]
                      dark:text-violet-400
                    "
                  >
                    {permissionUser.first_name?.[0] || ''}
                    {permissionUser.last_name?.[0] || ''}
                  </div>

                  <div>

                    <p className="font-semibold text-gray-900 dark:text-white">
                      {getFullName(
                        permissionUser
                      )}
                    </p>

                    <div className="mt-1 flex items-center gap-2">

                      <Badge
                        variant={
                          getRoleVariant(
                            permissionUser.role
                          )
                        }
                      >
                        {getRoleLabel(
                          permissionUser.role
                        )}
                      </Badge>

                      <span className="text-xs text-gray-500 dark:text-slate-500">
                        {permissionUser.email}
                      </span>

                    </div>

                  </div>

                </div>

                <Badge
                  variant={
                    permissionUser.is_active
                      ? 'success'
                      : 'danger'
                  }
                  dot
                >
                  {permissionUser.is_active
                    ? 'Aktif'
                    : 'Pasif'}
                </Badge>

              </div>

              {/* PRESETS */}

              {permissionUser.role ===
                'lawyer' && (
                <div
                  className="
                    rounded-xl
                    border
                    border-violet-200
                    bg-violet-50/60
                    p-4
                    dark:border-violet-500/15
                    dark:bg-violet-500/[0.04]
                  "
                >

                  <div className="mb-3">

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Hızlı Yetki Şablonu
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                      Hazır bir avukat profili uygulayabilir, ardından yetkileri tek tek özelleştirebilirsiniz.
                    </p>

                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">

                    <select
                      value={
                        selectedPreset
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedPreset(
                          event.target.value
                        )
                      }
                      disabled={
                        isPermissionUpdating
                      }
                      className="
                        h-10
                        flex-1
                        rounded-lg
                        border
                        border-gray-200
                        bg-white
                        px-3.5
                        text-sm
                        text-gray-700
                        outline-none
                        dark:border-white/[0.08]
                        dark:bg-[#0b1b33]
                        dark:text-slate-300
                      "
                    >
                      {LAWYER_PRESETS.map(
                        (
                          preset
                        ) => (
                          <option
                            key={
                              preset.value
                            }
                            value={
                              preset.value
                            }
                          >
                            {preset.label}
                          </option>
                        )
                      )}
                    </select>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        !selectedPreset ||
                        isPermissionUpdating
                      }
                      loading={
                        presetMutation.isPending
                      }
                      onClick={
                        handleApplyPreset
                      }
                    >
                      Şablonu Uygula
                    </Button>

                  </div>

                </div>
              )}

              {/* LOADING */}

              {(isPermissionsLoading ||
                isPermissionsFetching) &&
                !permissionData && (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <Loader text="Yetkiler yükleniyor..." />
                  </div>
                )}

              {/* ERROR */}

              {permissionsError &&
                !permissionData && (
                  <Error
                    title="Yetkiler yüklenemedi"
                    message="Kullanıcı yetkileri alınırken bir hata oluştu."
                    error={
                      permissionsError
                    }
                    onRetry={() =>
                      refetchPermissions?.()
                    }
                  />
                )}

              {/* PERMISSIONS */}

              {permissionData && (
                <>

                  <div
                    className="
                      rounded-xl
                      border
                      border-blue-200
                      bg-blue-50/60
                      px-4
                      py-3
                      text-xs
                      leading-5
                      text-blue-800
                      dark:border-blue-500/15
                      dark:bg-blue-500/[0.04]
                      dark:text-blue-300
                    "
                  >
                    <strong>Rol varsayılanı</strong> seçeneği kullanıcının rolünden gelen standart yetkiyi kullanır. <strong>İzin ver</strong> rol dışında özel erişim açar. <strong>Engelle</strong> ise rol normalde izin verse bile bu kullanıcı için erişimi kapatır.
                  </div>

                  <div className="space-y-4">

                    {groupedPermissions.map(
                      (
                        group
                      ) => (
                        <div
                          key={
                            group.key
                          }
                          className="
                            overflow-hidden
                            rounded-xl
                            border
                            border-gray-200
                            dark:border-white/[0.07]
                          "
                        >

                          <div
                            className="
                              border-b
                              border-gray-100
                              bg-gray-50/80
                              px-4
                              py-3
                              dark:border-white/[0.06]
                              dark:bg-white/[0.025]
                            "
                          >
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {group.label}
                            </p>
                          </div>

                          <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                            {group.permissions.map(
                              (
                                permission
                              ) => {
                                const override =
                                  permissionOverrides[
                                    permission
                                  ];

                                const hasOverride =
                                  Object.prototype.hasOwnProperty.call(
                                    permissionOverrides,
                                    permission
                                  );

                                const effective =
                                  effectivePermissions.includes(
                                    permission
                                  );

                                const currentMode =
                                  !hasOverride
                                    ? 'default'
                                    : override ===
                                        true
                                      ? 'allow'
                                      : 'deny';

                                return (
                                  <div
                                    key={
                                      permission
                                    }
                                    className="
                                      flex
                                      flex-col
                                      gap-3
                                      px-4
                                      py-3
                                      sm:flex-row
                                      sm:items-center
                                      sm:justify-between
                                    "
                                  >

                                    <div>

                                      <div className="flex flex-wrap items-center gap-2">

                                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                                          {formatPermissionLabel(
                                            permission
                                          )}
                                        </p>

                                        <Badge
                                          variant={
                                            effective
                                              ? 'success'
                                              : 'default'
                                          }
                                        >
                                          {effective
                                            ? 'Erişim Var'
                                            : 'Erişim Yok'}
                                        </Badge>

                                        {hasOverride && (
                                          <Badge
                                            variant={
                                              override
                                                ? 'primary'
                                                : 'danger'
                                            }
                                          >
                                            Özel
                                          </Badge>
                                        )}

                                      </div>

                                      <p className="mt-1 font-mono text-[10px] text-gray-400 dark:text-slate-600">
                                        {permission}
                                      </p>

                                    </div>

                                    <select
                                      value={
                                        currentMode
                                      }
                                      disabled={
                                        isPermissionUpdating
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        handlePermissionChange(
                                          permission,
                                          event.target.value
                                        )
                                      }
                                      className="
                                        h-9
                                        min-w-[170px]
                                        rounded-lg
                                        border
                                        border-gray-200
                                        bg-white
                                        px-3
                                        text-xs
                                        font-medium
                                        text-gray-700
                                        outline-none
                                        focus:border-blue-500
                                        dark:border-white/[0.08]
                                        dark:bg-white/[0.035]
                                        dark:text-slate-300
                                      "
                                    >
                                      <option value="default">
                                        Rol Varsayılanı
                                      </option>

                                      <option value="allow">
                                        İzin Ver
                                      </option>

                                      <option value="deny">
                                        Engelle
                                      </option>
                                    </select>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>
                      )
                    )}

                  </div>

                  {/* ACTIONS */}

                  <div
                    className="
                      sticky
                      bottom-0
                      flex
                      flex-col-reverse
                      gap-2
                      border-t
                      border-gray-100
                      bg-white
                      pt-4
                      dark:border-white/[0.06]
                      dark:bg-[#0b1b33]
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        isPermissionUpdating
                      }
                      onClick={
                        handleResetPermissions
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Rol Varsayılanlarına Dön
                    </Button>

                    <div className="flex justify-end gap-2">

                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          isPermissionUpdating
                        }
                        onClick={
                          closePermissionModal
                        }
                      >
                        Kapat
                      </Button>

                      <Button
                        type="button"
                        loading={
                          permissionMutation.isPending
                        }
                        disabled={
                          isPermissionUpdating
                        }
                        onClick={
                          handleSavePermissions
                        }
                      >
                        <Save className="h-4 w-4" />
                        Yetkileri Kaydet
                      </Button>

                    </div>

                  </div>

                </>
              )}

            </div>
          )}

        </Modal>

      </div>
    );
  };

  export default UserList;