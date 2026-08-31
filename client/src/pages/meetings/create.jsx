import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useCreateMeeting,
} from '../../features/meetings/meeting.query.js';
import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';
import userApi from '../../features/users/user.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Link2,
  MapPin,
  Plus,
  Save,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_TITLE_LENGTH =
  255;

const MAX_DESCRIPTION_LENGTH =
  5000;

const MAX_LOCATION_LENGTH =
  500;

const MAX_NOTES_LENGTH =
  5000;

const MAX_ATTENDEE_NAME_LENGTH =
  200;

const MAX_ATTENDEE_ROLE_LENGTH =
  150;

const INITIAL_FORM = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  location: '',
  meeting_type: 'other',
  case_id: '',
  client_id: '',
  assigned_to: '',
  status: 'scheduled',
  attendees: [],
  meeting_link: '',
  notes: '',
};

const MEETING_TYPE_OPTIONS = [
  {
    value: 'client',
    label: 'Müvekkil Görüşmesi',
  },
  {
    value: 'internal',
    label: 'İç Toplantı',
  },
  {
    value: 'phone',
    label: 'Telefon Görüşmesi',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

const STATUS_OPTIONS = [
  {
    value: 'scheduled',
    label: 'Planlandı',
  },
  {
    value: 'ongoing',
    label: 'Devam Ediyor',
  },
  {
    value: 'completed',
    label: 'Tamamlandı',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

// ======================================================
// HELPERS
// ======================================================

const normalizeId = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value ===
    'object'
  ) {
    const objectId =
      value?.id ??
      value?._id;

    if (
      objectId === null ||
      objectId === undefined ||
      objectId === ''
    ) {
      return '';
    }

    return String(
      objectId
    );
  }

  return String(
    value
  );
};

const getArrayPayload = (
  response
) => {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate;
    }

    if (
      Array.isArray(
        candidate?.data
      )
    ) {
      return candidate.data;
    }

    if (
      Array.isArray(
        candidate?.items
      )
    ) {
      return candidate.items;
    }

    if (
      Array.isArray(
        candidate?.results
      )
    ) {
      return candidate.results;
    }

    if (
      Array.isArray(
        candidate?.rows
      )
    ) {
      return candidate.rows;
    }

    if (
      Array.isArray(
        candidate?.cases
      )
    ) {
      return candidate.cases;
    }
  }

  return [];
};

const getResponseItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};

const getBackendFieldErrors = (
  error
) => {
  const source =
    error?.response?.data?.errors ??
    error?.response?.data?.validation_errors ??
    null;

  if (!source) {
    return {};
  }

  if (
    Array.isArray(
      source
    )
  ) {
    return source.reduce(
      (
        result,
        item
      ) => {
        const field =
          item?.path ??
          item?.param ??
          item?.field;

        const message =
          item?.msg ??
          item?.message;

        if (
          field &&
          message
        ) {
          result[field] =
            String(
              message
            );
        }

        return result;
      },
      {}
    );
  }

  if (
    typeof source ===
    'object'
  ) {
    return Object.entries(
      source
    ).reduce(
      (
        result,
        [field, value]
      ) => {
        const message =
          Array.isArray(
            value
          )
            ? value[0]
            : value;

        if (
          message !== null &&
          message !== undefined
        ) {
          result[field] =
            String(
              message
            );
        }

        return result;
      },
      {}
    );
  }

  return {};
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const isAllowedOption = (
  options,
  value
) => {
  return options.some(
    (option) =>
      option.value ===
      value
  );
};

const getRoleLabel = (
  role
) => {
  const labels = {
    admin: 'Yönetici',
    lawyer: 'Avukat',
    intern: 'Stajyer',
    secretary: 'Sekreter',
  };

  return (
    labels[role] ||
    role ||
    'Kullanıcı'
  );
};

const getMeetingTypeLabel = (
  type
) => {
  return (
    MEETING_TYPE_OPTIONS.find(
      (option) =>
        option.value ===
        type
    )?.label ||
    'Diğer'
  );
};

const getStatusVariant = (
  status
) => {
  const variants = {
    scheduled: 'warning',
    ongoing: 'info',
    completed: 'success',
    cancelled: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getStatusLabel = (
  status
) => {
  return (
    STATUS_OPTIONS.find(
      (option) =>
        option.value ===
        status
    )?.label ||
    status
  );
};

/*
 * datetime-local kullanıcının ekranda
 * Türkiye saatiyle girdiği değeri temsil ediyor.
 *
 * Backend'e ISO UTC gönderiyoruz.
 *
 * Örn:
 * 2026-08-17T14:30
 * ->
 * 2026-08-17T11:30:00.000Z
 */
const localToUTC = (
  dateTime
) => {
  if (!dateTime) {
    return null;
  }

  try {
    const normalized =
      dateTime.length === 16
        ? `${dateTime}:00`
        : dateTime;

    const date =
      new Date(
        `${normalized}+03:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
  } catch {
    return null;
  }
};

const isValidHttpUrl = (
  value
) => {
  if (!value) {
    return true;
  }

  try {
    const url =
      new URL(value);

    return [
      'http:',
      'https:',
    ].includes(
      url.protocol
    );
  } catch {
    return false;
  }
};

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return 'Dava';
  }

  const courtName =
    String(
      caseItem.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      caseItem.case_number ||
      ''
    ).trim();

  if (
    courtName &&
    caseNumber
  ) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    'Dava'
  );
};

const getCaseSecondaryInfo = (
  caseItem
) => {
  if (!caseItem) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};

// ======================================================
// COMPONENT
// ======================================================

const MeetingCreate = () => {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  /*
   * ClientDetail şu URL ile gelir:
   *   /meetings/create?client_id=<id>
   *
   * Eski ekran query parametresini hiç okumuyordu.
   * Geriye dönük uyumluluk için client/clientId ve case/caseId
   * alias'larını da kabul ediyoruz.
   */
  const requestedClientId =
    normalizeId(
      searchParams.get(
        'client_id'
      ) ??
      searchParams.get(
        'client'
      ) ??
      searchParams.get(
        'clientId'
      )
    );

  const requestedCaseId =
    normalizeId(
      searchParams.get(
        'case_id'
      ) ??
      searchParams.get(
        'case'
      ) ??
      searchParams.get(
        'caseId'
      )
    );

  const {
    user,
  } =
    useAuth();

  const prefillAppliedRef =
    useRef(false);

  const [
    formData,
    setFormData,
  ] =
    useState(
      () => ({
        ...INITIAL_FORM,

        client_id:
          requestedClientId,

        case_id:
          requestedCaseId,
      })
    );

  const [
    attendeeName,
    setAttendeeName,
  ] =
    useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] =
    useState('');

  const [
    errors,
    setErrors,
  ] =
    useState({});

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
  } =
    useQuery({
      queryKey: [
        'cases',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        caseApi.getAll({
          limit: 100,
        }),
    });

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
  } =
    useQuery({
      queryKey: [
        'clients',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        clientApi.getAll({
          limit: 100,
        }),
    });

  const {
    data:
      requestedClientData,
    isLoading:
      requestedClientLoading,
    error:
      requestedClientError,
  } =
    useQuery({
      queryKey: [
        'client',
        requestedClientId,
      ],

      queryFn: () =>
        clientApi.getOne(
          requestedClientId
        ),

      enabled:
        Boolean(
          requestedClientId
        ),

      staleTime:
        0,

      retry:
        false,
    });

  const {
    data:
      clientCasesData,
    isLoading:
      clientCasesLoading,
  } =
    useQuery({
      queryKey: [
        'clients',
        formData.client_id,
        'cases',
      ],

      queryFn: () =>
        clientApi.getCaseHistory(
          formData.client_id
        ),

      enabled:
        Boolean(
          formData.client_id
        ),
    });

  const {
    data:
      usersData,
    isLoading:
      usersLoading,
  } =
    useQuery({
      queryKey: [
        'users',
      ],

      queryFn: () =>
        userApi.getAll(),
    });

  // ====================================================
  // DATA
  // ====================================================

  const cases =
    getArrayPayload(
      casesData
    );

  const baseClients =
    getArrayPayload(
      clientsData
    );

  const requestedClient =
    getResponseItem(
      requestedClientData
    );

  const clients =
    useMemo(() => {
      const result = [
        ...baseClients,
      ];

      const requestedId =
        normalizeId(
          requestedClient?.id
        );

      if (
        requestedId &&
        !result.some(
          (client) =>
            normalizeId(
              client?.id
            ) ===
            requestedId
        )
      ) {
        result.unshift(
          requestedClient
        );
      }

      return result;
    }, [
      baseClients,
      requestedClient,
    ]);

  const users =
    getArrayPayload(
      usersData
    );

  const clientCases =
    getArrayPayload(
      clientCasesData
    );

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const clientSelectLoading =
    clientsLoading ||
    (
      Boolean(
        requestedClientId
      ) &&
      requestedClientLoading
    );

  const assignableUsers =
    useMemo(() => {
      const normalizedUserId =
        normalizeId(
          user?.id
        );

      if (
        user?.role ===
        'admin'
      ) {
        return users.filter(
          (person) =>
            person?.is_active !==
            false
        );
      }

      const currentUserInList =
        users.find(
          (person) =>
            normalizeId(
              person?.id
            ) ===
            normalizedUserId
        );

      if (
        currentUserInList
      ) {
        return [
          currentUserInList,
        ];
      }

      return normalizedUserId
        ? [
            {
              ...user,
              id:
                normalizedUserId,
            },
          ]
        : [];
    }, [
      users,
      user,
    ]);

  const selectedCase =
    useMemo(() => {
      return relationCases.find(
        (
          item
        ) =>
          normalizeId(
            item?.id
          ) ===
          normalizeId(
            formData.case_id
          )
      );
    }, [
      relationCases,
      formData.case_id,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          item
        ) =>
          normalizeId(
            item?.id
          ) ===
          normalizeId(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  useEffect(() => {
    if (
      prefillAppliedRef.current
    ) {
      return;
    }

    if (
      requestedClientId
    ) {
      if (
        requestedClientLoading
      ) {
        return;
      }

      if (
        requestedClientError ||
        !requestedClient
      ) {
        prefillAppliedRef.current =
          true;

        setFormData(
          (
            current
          ) => ({
            ...current,
            client_id:
              '',
            case_id:
              '',
          })
        );

        toast.error(
          'Bağlantıdaki müvekkil artık erişilebilir değil'
        );

        return;
      }
    }

    if (
      requestedClientId &&
      normalizeId(
        requestedClient?.id
      ) !==
        requestedClientId
    ) {
      return;
    }

    setFormData(
      (
        current
      ) => ({
        ...current,

        client_id:
          requestedClientId ||
          current.client_id,

        case_id:
          requestedCaseId ||
          current.case_id,

      })
    );

    prefillAppliedRef.current =
      true;
  }, [
    requestedClientId,
    requestedCaseId,
    requestedClient,
    requestedClientLoading,
    requestedClientError,
  ]);

  // ====================================================
  // MUTATION
  // ====================================================

  const createMeeting =
    useCreateMeeting();

  /*
   * Cache invalidation meeting.query.js içinde merkezi olarak yapılıyor.
   * Burada tekrar invalidate/setQueryData yapmıyoruz:
   * - aynı sorguların iki kez refetch edilmesini önler,
   * - create response'u kısmi ise detail cache'inin eksik veriyle
   *   taze kabul edilmesi riskini ortadan kaldırır.
   *
   * Bu component sadece navigation ve backend field-error eşlemesini
   * yönetir.
   */
  const mutation = {
    ...createMeeting,

    mutate: (
      submitData
    ) => {
      if (
        createMeeting.isPending
      ) {
        return;
      }

      createMeeting.mutate(
        submitData,
        {
          onSuccess: (
            response
          ) => {
            const meeting =
              getResponseItem(
                response
              );

            const meetingId =
              normalizeId(
                meeting?.id
              );

            navigate(
              meetingId
                ? `/meetings/${meetingId}`
                : '/meetings'
            );
          },

          onError: (
            error
          ) => {
            const fieldErrors =
              getBackendFieldErrors(
                error
              );

            if (
              Object.keys(
                fieldErrors
              ).length >
              0
            ) {
              setErrors(
                (
                  current
                ) => ({
                  ...current,
                  ...fieldErrors,
                })
              );
            }
          },
        }
      );
    },
  };

  // ====================================================
  // FORM HANDLERS
  // ====================================================

  const handleChange =
    (
      event
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const {
        name,
        value,
      } =
        event.target;

      setFormData(
        (
          current
        ) => {
          if (
            name ===
            'client_id'
          ) {
            return {
              ...current,

              client_id:
                normalizeId(
                  value
                ),

              case_id:
                '',
            };
          }

          if (
            name ===
            'case_id' ||
            name ===
            'assigned_to'
          ) {
            return {
              ...current,

              [name]:
                normalizeId(
                  value
                ),
            };
          }

          return {
            ...current,

            [name]:
              value,
          };
        }
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
  // ATTENDEES
  // ====================================================

  const handleAddAttendee =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      const name =
        attendeeName
          .trim()
          .slice(
            0,
            MAX_ATTENDEE_NAME_LENGTH
          );

      const role =
        attendeeRole
          .trim()
          .slice(
            0,
            MAX_ATTENDEE_ROLE_LENGTH
          );

      if (!name) {
        return;
      }

      const alreadyExists =
        formData.attendees.some(
          (
            attendee
          ) =>
            attendee.name
              ?.trim()
              .toLocaleLowerCase(
                'tr-TR'
              ) ===
            name.toLocaleLowerCase(
              'tr-TR'
            )
        );

      if (
        alreadyExists
      ) {
        toast.error(
          'Bu katılımcı zaten eklenmiş'
        );

        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          attendees: [
            ...current.attendees,

            {
              name,
              role:
                role ||
                'Katılımcı',
            },
          ],
        })
      );

      setAttendeeName(
        ''
      );

      setAttendeeRole(
        ''
      );
    };

  const handleRemoveAttendee =
    (
      index
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          attendees:
            current.attendees.filter(
              (
                _,
                currentIndex
              ) =>
                currentIndex !==
                index
            ),
        })
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

      if (
        mutation.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      const title =
        formData.title
          .trim();

      const description =
        formData.description
          ?.trim() ||
        '';

      const location =
        formData.location
          ?.trim() ||
        '';

      const meetingLink =
        formData.meeting_link
          ?.trim() ||
        '';

      const notes =
        formData.notes
          ?.trim() ||
        '';

      const clientId =
        normalizeId(
          formData.client_id
        );

      const caseId =
        normalizeId(
          formData.case_id
        );

      if (
        !title
      ) {
        newErrors.title =
          'Toplantı başlığı gereklidir';
      } else if (
        title.length >
        MAX_TITLE_LENGTH
      ) {
        newErrors.title =
          `Toplantı başlığı en fazla ${MAX_TITLE_LENGTH} karakter olabilir`;
      }

      if (
        description.length >
        MAX_DESCRIPTION_LENGTH
      ) {
        newErrors.description =
          `Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir`;
      }

      if (
        location.length >
        MAX_LOCATION_LENGTH
      ) {
        newErrors.location =
          `Toplantı yeri en fazla ${MAX_LOCATION_LENGTH} karakter olabilir`;
      }

      if (
        notes.length >
        MAX_NOTES_LENGTH
      ) {
        newErrors.notes =
          `Notlar en fazla ${MAX_NOTES_LENGTH} karakter olabilir`;
      }

      if (
        !formData.start_date
      ) {
        newErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.start_date &&
        !localToUTC(
          formData.start_date
        )
      ) {
        newErrors.start_date =
          'Geçerli bir başlangıç tarihi girin';
      }

      if (
        formData.end_date &&
        !localToUTC(
          formData.end_date
        )
      ) {
        newErrors.end_date =
          'Geçerli bir bitiş tarihi girin';
      } else if (
        formData.start_date &&
        formData.end_date &&
        formData.end_date <
          formData.start_date
      ) {
        newErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }

      if (
        meetingLink &&
        !isValidHttpUrl(
          meetingLink
        )
      ) {
        newErrors.meeting_link =
          'Geçerli bir toplantı bağlantısı girin';
      }

      if (
        !isAllowedOption(
          MEETING_TYPE_OPTIONS,
          formData.meeting_type
        )
      ) {
        newErrors.meeting_type =
          'Geçerli bir toplantı türü seçin';
      }

      if (
        !isAllowedOption(
          STATUS_OPTIONS,
          formData.status
        )
      ) {
        newErrors.status =
          'Geçerli bir toplantı durumu seçin';
      }

      /*
       * Query parametresi veya DOM manipülasyonu ile erişilemeyen bir
       * müvekkil ID'sinin submit edilmesini engeller.
       */
      if (
        clientId
      ) {
        const clientExists =
          clients.some(
            (client) =>
              normalizeId(
                client?.id
              ) ===
              clientId
          );

        if (
          !clientExists ||
          requestedClientError
        ) {
          newErrors.client_id =
            'Seçilen müvekkil artık erişilebilir değil';
        }
      }

      if (
        caseId
      ) {
        const caseExists =
          clientId &&
          clientCases.some(
            (caseItem) =>
              normalizeId(
                caseItem?.id
              ) ===
              caseId
          );

        if (
          !caseExists
        ) {
          newErrors.case_id =
            'Seçilen dava bu müvekkile bağlı değil veya artık erişilebilir değil';
        }
      }

      const assignedTo =
        user?.role !==
        'admin'
          ? normalizeId(
              user?.id
            )
          : normalizeId(
              formData.assigned_to
            );

      if (
        user?.role !==
          'admin' &&
        !assignedTo
      ) {
        newErrors.assigned_to =
          'Sorumlu kullanıcı belirlenemedi';
      }

      if (
        user?.role ===
          'admin' &&
        assignedTo &&
        !assignableUsers.some(
          (person) =>
            normalizeId(
              person?.id
            ) ===
            assignedTo
        )
      ) {
        newErrors.assigned_to =
          'Seçilen kullanıcı artık atanabilir değil';
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

        toast.error(
          'Formdaki eksik veya hatalı alanları kontrol edin'
        );

        return;
      }

      const submitData = {
        ...formData,

        title,

        description:
          description ||
          null,

        location:
          location ||
          null,

        meeting_link:
          meetingLink ||
          null,

        notes:
          notes ||
          null,

        start_date:
          localToUTC(
            formData.start_date
          ),

        end_date:
          formData.end_date
            ? localToUTC(
                formData.end_date
              )
            : null,

        case_id:
          caseId ||
          null,

        client_id:
          clientId ||
          null,

        assigned_to:
          assignedTo ||
          null,

        attendees:
          formData.attendees
            .map(
              (
                attendee
              ) => ({
                name:
                  String(
                    attendee?.name ??
                    ''
                  )
                    .trim()
                    .slice(
                      0,
                      MAX_ATTENDEE_NAME_LENGTH
                    ),

                role:
                  String(
                    attendee?.role ??
                    'Katılımcı'
                  )
                    .trim()
                    .slice(
                      0,
                      MAX_ATTENDEE_ROLE_LENGTH
                    ) ||
                  'Katılımcı',
              })
            )
            .filter(
              (
                attendee
              ) =>
                Boolean(
                  attendee.name
                )
            ),
      };

      mutation.mutate(
        submitData
      );
    };

  const isDirty =
    Boolean(
      formData.title.trim() ||
      formData.description.trim() ||
      formData.start_date ||
      formData.end_date ||
      formData.location.trim() ||
      formData.case_id ||
      formData.client_id ||
      formData.assigned_to ||
      formData.attendees.length ||
      formData.meeting_link.trim() ||
      formData.notes.trim() ||
      formData.meeting_type !==
        'other' ||
      formData.status !==
        'scheduled'
    );

  const cancelDestination =
    requestedClientId
      ? `/clients/${requestedClientId}`
      : '/meetings';

  useEffect(() => {
    const handleBeforeUnload =
      (
        event
      ) => {
        if (
          !isDirty ||
          mutation.isPending
        ) {
          return;
        }

        event.preventDefault();
        event.returnValue =
          '';
      };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [
    isDirty,
    mutation.isPending,
  ]);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={
            cancelDestination
          }
          onClick={(
            event
          ) => {
            if (
              mutation.isPending
            ) {
              event.preventDefault();
              return;
            }

            if (
              isDirty &&
              !window.confirm(
                'Kaydedilmemiş toplantı bilgileri var. Çıkmak istediğinize emin misiniz?'
              )
            ) {
              event.preventDefault();
            }
          }}
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

          {requestedClientId
            ? 'Müvekkil Detayı'
            : 'Toplantılar'}
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
              bg-emerald-50
              text-emerald-600
              dark:bg-emerald-500/[0.08]
              dark:text-emerald-400
            "
          >
            <Users size={21} />
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
              Yeni Toplantı
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
              Toplantının zamanını, katılımcılarını ve ilişkili dava veya müvekkil kayıtlarını belirleyin.
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
            BASIC INFO
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
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Toplantı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Başlık, toplantı türü ve açıklama
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Toplantı Başlığı *"
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
              maxLength={
                MAX_TITLE_LENGTH
              }
              placeholder="Örn: Dava stratejisi değerlendirme toplantısı"
              autoFocus
            />

            <div className="grid gap-4 md:grid-cols-2">

              {/* TYPE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Toplantı Türü
                </label>

                <select
                  name="meeting_type"
                  value={
                    formData.meeting_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
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
                  {MEETING_TYPE_OPTIONS.map(
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

                {errors.meeting_type && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.meeting_type}
                  </p>
                )}

              </div>

              {/* STATUS */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    mutation.isPending
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
                  {STATUS_OPTIONS.map(
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

                {errors.status && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.status}
                  </p>
                )}

              </div>

            </div>

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
                  mutation.isPending
                }
                rows={4}
                maxLength={
                  MAX_DESCRIPTION_LENGTH
                }
                placeholder="Gündem, görüşülecek konular veya toplantının amacı..."
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
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

              {errors.description && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {errors.description}
                </p>
              )}

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            DATE & LOCATION
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
                <CalendarClock size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Tarih ve Konum
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantının ne zaman ve nerede yapılacağını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Başlangıç Tarihi *"
                name="start_date"
                type="datetime-local"
                value={
                  formData.start_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.start_date
                }
              disabled={
                mutation.isPending
              }
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="datetime-local"
                value={
                  formData.end_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.end_date
                }
                min={
                  formData.start_date ||
                  undefined
                }
              disabled={
                mutation.isPending
              }
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Toplantı Yeri"
                name="location"
                value={
                  formData.location
                }
                onChange={
                  handleChange
                }
                maxLength={
                  MAX_LOCATION_LENGTH
                }
                error={
                  errors.location
                }
                placeholder="Örn: Toplantı Odası 1"
                icon={
                  <MapPin size={16} />
                }
              />

              <Input
                label="Online Toplantı Linki"
                name="meeting_link"
                type="url"
                value={
                  formData.meeting_link
                }
                onChange={
                  handleChange
                }
                error={
                  errors.meeting_link
                }
                placeholder="https://zoom.us/..."
                icon={
                  <Video size={16} />
                }
              />

            </div>

            {formData.meeting_link && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-blue-50
                  px-3
                  py-2
                  text-xs
                  text-blue-700
                  dark:bg-blue-500/[0.05]
                  dark:text-blue-400
                "
              >
                <Link2 className="h-4 w-4 shrink-0" />

                Online toplantı bağlantısı kayda eklenecek.
              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            RELATIONS
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
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Önce müvekkili, ardından o müvekkile ait davayı seçin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CLIENT */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Müvekkil
                </label>

                <select
                  name="client_id"
                  value={
                    formData.client_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    clientSelectLoading ||
                    mutation.isPending
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {clientSelectLoading
                      ? 'Müvekkiller yükleniyor...'
                      : 'Müvekkil seçin (isteğe bağlı)'}
                  </option>

                  {clients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name}
                        {client.company_name
                          ? ` · ${client.company_name}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                {errors.client_id && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
                )}

                {selectedClient && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >

                    <UserRound
                      size={15}
                      className="shrink-0 text-gray-400"
                    />

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {selectedClient.name}
                    </p>

                  </div>
                )}

              </div>

              {/* CASE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Dava
                </label>

                <select
                  name="case_id"
                  value={
                    formData.case_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    relationCasesLoading ||
                    !formData.client_id ||
                    mutation.isPending
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {!formData.client_id
                      ? 'Önce müvekkil seçin'
                      : relationCasesLoading
                        ? 'Davalar yükleniyor...'
                        : relationCases.length >
                            0
                          ? 'Dava seçin (isteğe bağlı)'
                          : 'Bu müvekkile ait dava bulunamadı'}
                  </option>

                  {relationCases.map(
                    (
                      caseItem
                    ) => (
                      <option
                        key={
                          caseItem.id
                        }
                        value={
                          caseItem.id
                        }
                      >
                        {getCaseDisplayName(
                          caseItem
                        )}
                      </option>
                    )
                  )}
                </select>

                {errors.case_id && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.case_id}
                  </p>
                )}

                {!formData.client_id && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Dava seçebilmek için önce ilişkili müvekkili seçin.
                  </p>
                )}

                {selectedCase && (
                  <div
                    className="
                      mt-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >
                    <div className="flex items-center gap-2">

                      <BriefcaseBusiness
                        size={15}
                        className="shrink-0 text-gray-400 dark:text-slate-500"
                      />

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {getCaseDisplayName(
                          selectedCase
                        )}
                      </p>

                    </div>

                    {getCaseSecondaryInfo(
                      selectedCase
                    ) && (
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                        {getCaseSecondaryInfo(
                          selectedCase
                        )}
                      </p>
                    )}
                  </div>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            RESPONSIBLE USER
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
                <UserRound size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Sorumlu Kişi
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantının takibinden sorumlu kullanıcı
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            {user?.role ===
            'admin' ? (
              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Atanan Kişi
                </label>

                <select
                  name="assigned_to"
                  value={
                    formData.assigned_to
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    usersLoading ||
                    mutation.isPending
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {usersLoading
                      ? 'Kullanıcılar yükleniyor...'
                      : 'Atanacak kişi seçin'}
                  </option>

                  {assignableUsers.map(
                    (
                      person
                    ) => (
                      <option
                        key={
                          person.id
                        }
                        value={
                          person.id
                        }
                      >
                        {person.first_name}{' '}
                        {person.last_name}
                        {' · '}
                        {getRoleLabel(
                          person.role
                        )}
                      </option>
                    )
                  )}
                </select>

                {errors.assigned_to && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                    {errors.assigned_to}
                  </p>
                )}

              </div>
            ) : (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50
                  p-4
                  dark:border-white/[0.06]
                  dark:bg-white/[0.025]
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      bg-blue-100
                      text-sm
                      font-semibold
                      text-blue-700
                      dark:bg-blue-500/[0.1]
                      dark:text-blue-400
                    "
                  >
                    {user?.first_name?.[0] ||
                      ''}
                    {user?.last_name?.[0] ||
                      ''}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.first_name}{' '}
                      {user?.last_name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                      {getRoleLabel(
                        user?.role
                      )}
                    </p>

                  </div>

                </div>

                <Badge
                  variant="primary"
                  dot
                >
                  Sorumlu
                </Badge>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            ATTENDEES
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
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Katılımcılar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantıya katılacak harici veya dahili kişileri ekleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="flex flex-col gap-2 md:flex-row">

              <input
                type="text"
                value={
                  attendeeName
                }
                onChange={(
                  event
                ) =>
                  setAttendeeName(
                    event.target.value.slice(
                      0,
                      MAX_ATTENDEE_NAME_LENGTH
                    )
                  )
                }
                maxLength={
                  MAX_ATTENDEE_NAME_LENGTH
                }
                disabled={
                  mutation.isPending
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Ad Soyad"
                className="
                  h-10
                  flex-1
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

              <input
                type="text"
                value={
                  attendeeRole
                }
                onChange={(
                  event
                ) =>
                  setAttendeeRole(
                    event.target.value.slice(
                      0,
                      MAX_ATTENDEE_ROLE_LENGTH
                    )
                  )
                }
                maxLength={
                  MAX_ATTENDEE_ROLE_LENGTH
                }
                disabled={
                  mutation.isPending
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Rol / Unvan"
                className="
                  h-10
                  md:w-48
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAttendee
                }
                disabled={
                  mutation.isPending
                }
              >
                <Plus className="h-4 w-4" />

                Ekle
              </Button>

            </div>

            {formData.attendees.length >
              0 ? (
              <div className="mt-4 flex flex-wrap gap-2">

                {formData.attendees.map(
                  (
                    attendee,
                    index
                  ) => (
                    <div
                      key={`${attendee.name}-${index}`}
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-gray-200
                        bg-gray-50
                        px-3
                        py-1.5
                        text-xs
                        text-gray-700
                        dark:border-white/[0.07]
                        dark:bg-white/[0.03]
                        dark:text-slate-300
                      "
                    >

                      <UserRound className="h-3.5 w-3.5 text-gray-400" />

                      <span className="font-medium">
                        {attendee.name}
                      </span>

                      {attendee.role && (
                        <span className="text-gray-400 dark:text-slate-500">
                          · {attendee.role}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAttendee(
                            index
                          )
                        }
                        disabled={
                          mutation.isPending
                        }
                        className="text-gray-400 transition hover:text-red-500"
                        aria-label={`${attendee.name} katılımcısını kaldır`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  )
                )}

              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Henüz ek katılımcı eklenmedi.
              </p>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            NOTES
        ================================================== */}

        <Card>

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Notlar
            </h2>

          </Card.Header>

          <Card.Body>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              disabled={
                mutation.isPending
              }
              rows={4}
              maxLength={
                MAX_NOTES_LENGTH
              }
              placeholder="Toplantıyla ilgili büro içi notlar, hazırlık bilgileri veya hatırlatmalar..."
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
                dark:border-white/[0.08]
                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500
              "
            />

            {errors.notes && (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {errors.notes}
              </p>
            )}

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

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Toplantı Türü
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getMeetingTypeLabel(
                formData.meeting_type
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Katılımcı
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {
                formData.attendees
                  .length
              } kişi
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Durum
            </p>

            <div className="mt-1">

              <Badge
                variant={
                  getStatusVariant(
                    formData.status
                  )
                }
                dot
              >
                {getStatusLabel(
                  formData.status
                )}
              </Badge>

            </div>

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
            onClick={() => {
              if (
                mutation.isPending
              ) {
                return;
              }

              if (
                isDirty &&
                !window.confirm(
                  'Kaydedilmemiş toplantı bilgileri var. İptal etmek istediğinize emin misiniz?'
                )
              ) {
                return;
              }

              navigate(
                cancelDestination
              );
            }}
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
            disabled={
              mutation.isPending ||
              clientSelectLoading
            }
          >
            <Save className="h-4 w-4" />

            Toplantı Oluştur
          </Button>

        </div>

      </form>

    </div>
  );
};

export default MeetingCreate;