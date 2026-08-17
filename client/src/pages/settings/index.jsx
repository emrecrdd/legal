import {
  useEffect,
  useState,
} from 'react';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  useTheme,
} from '../../app/providers/theme.provider.jsx';

import {
  useMutation,
} from '@tanstack/react-query';

import authApi from '../../features/auth/auth.api.js';

import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Moon,
  Save,
  Settings2,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const TABS = [
  {
    id: 'profile',
    label: 'Profil',
    description: 'Kişisel bilgiler',
    icon: UserRound,
  },
  {
    id: 'security',
    label: 'Güvenlik',
    description: 'Şifre ve erişim',
    icon: ShieldCheck,
  },
  {
    id: 'preferences',
    label: 'Tercihler',
    description: 'Görünüm ve hesap',
    icon: Settings2,
  },
];

// ======================================================
// HELPERS
// ======================================================

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
    '-'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const Settings = () => {
  const {
    user,
    logout,
  } =
    useAuth();

  const {
    theme,
    toggleTheme,
  } =
    useTheme();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      'profile'
    );

  const [
    profileForm,
    setProfileForm,
  ] =
    useState({
      first_name:
        user?.first_name ||
        '',

      last_name:
        user?.last_name ||
        '',

      phone:
        user?.phone ||
        '',

      title:
        user?.title ||
        '',

      bio:
        user?.bio ||
        '',
    });

  const [
    passwordForm,
    setPasswordForm,
  ] =
    useState({
      currentPassword:
        '',

      newPassword:
        '',

      confirmPassword:
        '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState({});

  // ====================================================
  // SYNC USER
  // ====================================================

  useEffect(() => {
    setProfileForm({
      first_name:
        user?.first_name ||
        '',

      last_name:
        user?.last_name ||
        '',

      phone:
        user?.phone ||
        '',

      title:
        user?.title ||
        '',

      bio:
        user?.bio ||
        '',
    });
  }, [
    user,
  ]);

  // ====================================================
  // PROFILE UPDATE
  // ====================================================

  const updateProfile =
    useMutation({
      mutationFn: (
        data
      ) =>
        authApi.updateProfile(
          data
        ),

      onSuccess: () => {
        toast.success(
          'Profil güncellendi'
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
            'Güncelleme başarısız'
        );
      },
    });

  // ====================================================
  // PASSWORD UPDATE
  // ====================================================

  const changePassword =
    useMutation({
      mutationFn: (
        data
      ) =>
        authApi.changePassword(
          data
        ),

      onSuccess: () => {
        toast.success(
          'Şifre değiştirildi'
        );

        setPasswordForm({
          currentPassword:
            '',

          newPassword:
            '',

          confirmPassword:
            '',
        });

        setErrors(
          {}
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
            'Şifre değiştirilemedi'
        );
      },
    });

  // ====================================================
  // HANDLERS
  // ====================================================

  const handleProfileChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setProfileForm(
        (
          current
        ) => ({
          ...current,
          [name]:
            value,
        })
      );
    };

  const handlePasswordChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setPasswordForm(
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

  const handleProfileSubmit =
    (
      event
    ) => {
      event.preventDefault();

      updateProfile.mutate(
        profileForm
      );
    };

  const handlePasswordSubmit =
    (
      event
    ) => {
      event.preventDefault();

      const newErrors =
        {};

      if (
        !passwordForm.currentPassword
      ) {
        newErrors.currentPassword =
          'Mevcut şifre gereklidir';
      }

      if (
        !passwordForm.newPassword
      ) {
        newErrors.newPassword =
          'Yeni şifre gereklidir';
      } else if (
        passwordForm.newPassword
          .length <
        6
      ) {
        newErrors.newPassword =
          'Yeni şifre en az 6 karakter olmalıdır';
      }

      if (
        !passwordForm.confirmPassword
      ) {
        newErrors.confirmPassword =
          'Yeni şifreyi tekrar girin';
      } else if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {
        newErrors.confirmPassword =
          'Şifreler eşleşmiyor';
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

      changePassword.mutate({
        currentPassword:
          passwordForm.currentPassword,

        newPassword:
          passwordForm.newPassword,
      });
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

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
            bg-slate-100
            text-slate-600
            dark:bg-white/[0.05]
            dark:text-slate-300
          "
        >
          <Settings2 size={21} />
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
            Ayarlar
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
            Profil bilgilerinizi, güvenlik ayarlarınızı ve kişisel tercihlerinizi yönetin.
          </p>

        </div>

      </div>

      {/* ==================================================
          TAB NAVIGATION
      ================================================== */}

      <Card>

        <Card.Body className="p-2">

          <div className="grid gap-2 sm:grid-cols-3">

            {TABS.map(
              (
                tab
              ) => {
                const Icon =
                  tab.icon;

                const isActive =
                  activeTab ===
                  tab.id;

                return (
                  <button
                    key={
                      tab.id
                    }
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        tab.id
                      )
                    }
                    className={`
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-4
                      py-3
                      text-left
                      transition
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/[0.08] dark:text-blue-300'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/[0.03] dark:hover:text-white'
                      }
                    `}
                  >

                    <div
                      className={`
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        ${
                          isActive
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/[0.12] dark:text-blue-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-500'
                        }
                      `}
                    >
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-sm font-semibold">
                        {tab.label}
                      </p>

                      <p
                        className={`
                          mt-0.5
                          truncate
                          text-[10px]
                          ${
                            isActive
                              ? 'text-blue-500/70 dark:text-blue-400/60'
                              : 'text-gray-400 dark:text-slate-600'
                          }
                        `}
                      >
                        {tab.description}
                      </p>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </Card.Body>

      </Card>

      {/* ==================================================
          PROFILE
      ================================================== */}

      {activeTab ===
        'profile' && (
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
                  Profil Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Sistem içerisinde görüntülenen kişisel bilgileriniz
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <form
              onSubmit={
                handleProfileSubmit
              }
              className="space-y-5"
            >

              {/* PROFILE SUMMARY */}

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
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-blue-600
                      text-sm
                      font-bold
                      text-white
                    "
                  >
                    {user?.first_name?.[0] || ''}
                    {user?.last_name?.[0] || ''}
                  </div>

                  <div>

                    <p className="font-semibold text-gray-900 dark:text-white">
                      {user?.first_name}{' '}
                      {user?.last_name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                      {user?.email ||
                        '-'}
                    </p>

                  </div>

                </div>

                <div className="flex flex-wrap gap-2">

                  <Badge
                    variant="primary"
                    dot
                  >
                    {getRoleLabel(
                      user?.role
                    )}
                  </Badge>

                  <Badge
                    variant={
                      user?.is_active
                        ? 'success'
                        : 'danger'
                    }
                    dot
                  >
                    {user?.is_active
                      ? 'Aktif Hesap'
                      : 'Pasif Hesap'}
                  </Badge>

                </div>

              </div>

              {/* NAME */}

              <div className="grid gap-4 md:grid-cols-2">

                <Input
                  label="Ad"
                  name="first_name"
                  value={
                    profileForm.first_name
                  }
                  onChange={
                    handleProfileChange
                  }
                  required
                />

                <Input
                  label="Soyad"
                  name="last_name"
                  value={
                    profileForm.last_name
                  }
                  onChange={
                    handleProfileChange
                  }
                  required
                />

              </div>

              {/* PHONE / TITLE */}

              <div className="grid gap-4 md:grid-cols-2">

                <Input
                  label="Telefon"
                  name="phone"
                  value={
                    profileForm.phone
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="05xx xxx xx xx"
                />

                <Input
                  label="Ünvan"
                  name="title"
                  value={
                    profileForm.title
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="Örn: Avukat"
                />

              </div>

              {/* BIO */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Biyografi
                </label>

                <textarea
                  name="bio"
                  value={
                    profileForm.bio
                  }
                  onChange={
                    handleProfileChange
                  }
                  rows={5}
                  maxLength={1000}
                  placeholder="Mesleki uzmanlık alanlarınız veya kısa profil bilginiz..."
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

                <p className="mt-1 text-right text-[10px] text-gray-400 dark:text-slate-600">
                  {profileForm.bio.length} / 1000
                </p>

              </div>

              {/* ACTION */}

              <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-white/[0.06]">

                <Button
                  type="submit"
                  loading={
                    updateProfile.isPending
                  }
                >
                  <Save className="h-4 w-4" />
                  Değişiklikleri Kaydet
                </Button>

              </div>

            </form>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          SECURITY
      ================================================== */}

      {activeTab ===
        'security' && (
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
                <KeyRound size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Şifre ve Güvenlik
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Hesabınıza erişim için kullanılan şifrenizi yönetin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

              <form
                onSubmit={
                  handlePasswordSubmit
                }
                className="space-y-4"
              >

                <Input
                  label="Mevcut Şifre"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={
                    passwordForm.currentPassword
                  }
                  onChange={
                    handlePasswordChange
                  }
                  error={
                    errors.currentPassword
                  }
                />

                <Input
                  label="Yeni Şifre"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={
                    passwordForm.newPassword
                  }
                  onChange={
                    handlePasswordChange
                  }
                  error={
                    errors.newPassword
                  }
                />

                <Input
                  label="Yeni Şifre Tekrar"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={
                    passwordForm.confirmPassword
                  }
                  onChange={
                    handlePasswordChange
                  }
                  error={
                    errors.confirmPassword
                  }
                />

                <div className="flex justify-end pt-2">

                  <Button
                    type="submit"
                    loading={
                      changePassword.isPending
                    }
                  >
                    <KeyRound className="h-4 w-4" />
                    Şifreyi Değiştir
                  </Button>

                </div>

              </form>

              {/* SECURITY INFO */}

              <div
                className="
                  h-fit
                  rounded-xl
                  border
                  border-emerald-100
                  bg-emerald-50/50
                  p-4
                  dark:border-emerald-500/10
                  dark:bg-emerald-500/[0.025]
                "
              >

                <div className="flex items-start gap-3">

                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <div>

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Güvenli şifre önerisi
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-slate-400">
                      Şifrenizde büyük/küçük harf, sayı ve özel karakter kombinasyonu kullanmanız önerilir.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          PREFERENCES
      ================================================== */}

      {activeTab ===
        'preferences' && (
        <div className="space-y-4">

          {/* THEME */}

          <Card>

            <Card.Header>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Görünüm
              </h2>

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
                  p-4
                  dark:border-white/[0.06]
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
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
                      rounded-lg
                      bg-gray-100
                      text-gray-600
                      dark:bg-white/[0.05]
                      dark:text-slate-300
                    "
                  >
                    {theme ===
                    'dark' ? (
                      <Moon size={18} />
                    ) : (
                      <Sun size={18} />
                    )}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Tema
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                      Şu anda{' '}
                      {theme ===
                      'dark'
                        ? 'koyu tema'
                        : 'açık tema'}{' '}
                      kullanılıyor.
                    </p>

                  </div>

                </div>

                <Button
                  variant="secondary"
                  onClick={
                    toggleTheme
                  }
                >
                  {theme ===
                  'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}

                  {theme ===
                  'dark'
                    ? 'Açık Temaya Geç'
                    : 'Koyu Temaya Geç'}
                </Button>

              </div>

            </Card.Body>

          </Card>

          {/* ACCOUNT */}

          <Card>

            <Card.Header>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Hesap
              </h2>

            </Card.Header>

            <Card.Body>

              <div className="grid gap-4 sm:grid-cols-2">

                <div
                  className="
                    rounded-xl
                    border
                    border-gray-100
                    p-4
                    dark:border-white/[0.06]
                  "
                >
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                    Kullanıcı Rolü
                  </p>

                  <div className="mt-2">

                    <Badge
                      variant="primary"
                      dot
                    >
                      {getRoleLabel(
                        user?.role
                      )}
                    </Badge>

                  </div>

                </div>

                <div
                  className="
                    rounded-xl
                    border
                    border-gray-100
                    p-4
                    dark:border-white/[0.06]
                  "
                >
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                    Hesap Durumu
                  </p>

                  <div className="mt-2">

                    <Badge
                      variant={
                        user?.is_active
                          ? 'success'
                          : 'danger'
                      }
                      dot
                    >
                      {user?.is_active
                        ? 'Aktif'
                        : 'Pasif'}
                    </Badge>

                  </div>

                </div>

              </div>

              <div className="mt-4 flex justify-end">

                <Button
                  variant="danger"
                  onClick={
                    logout
                  }
                >
                  <LogOut className="h-4 w-4" />
                  Çıkış Yap
                </Button>

              </div>

            </Card.Body>

          </Card>

          {/* DANGER ZONE */}

          <Card
            className="
              border
              border-red-200
              dark:border-red-500/15
            "
          >

            <Card.Header>

              <div>

                <h2 className="font-semibold text-red-600 dark:text-red-400">
                  Tehlikeli Bölge
                </h2>

                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  Geri dönüşü olmayan hesap işlemleri
                </p>

              </div>

            </Card.Header>

            <Card.Body>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Hesabı kalıcı olarak sil
                  </p>

                  <p className="mt-1 max-w-xl text-xs leading-5 text-gray-500 dark:text-slate-400">
                    burayı sonra yapcam
                  </p>

                </div>

                <Button
                  variant="danger"
                  disabled
                  title="Hesap silme akışı henüz aktif değil"
                >
                  Hesabı Sil
                </Button>

              </div>

            </Card.Body>

          </Card>

        </div>
      )}

    </div>
  );
};

export default Settings;