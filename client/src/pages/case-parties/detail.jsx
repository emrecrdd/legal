import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import casePartyApi from '../../features/case-parties/case-party.api.js';

import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  ArrowLeft,
  Building2,
  Edit2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Scale,
  UserRound,
  Users,
} from 'lucide-react';

// ======================================================
// HELPERS
// ======================================================

const getPartyTypeLabel = (
  type
) => {
  const labels = {
    davaci: 'Davacı',
    davali: 'Davalı',
    supheli: 'Şüpheli',
    sanik: 'Sanık',
    musteki: 'Müşteki',
    katilan: 'Katılan',
    magdur: 'Mağdur',
    maktul: 'Maktul',
    alacakli: 'Alacaklı',
    borclu: 'Borçlu',
    ucuncu_kisi: 'Üçüncü Kişi',
  };

  return (
    labels[type] ||
    type ||
    'Bilinmiyor'
  );
};

const getPartyTypeVariant = (
  type
) => {
  const variants = {
    davaci: 'success',
    davali: 'danger',

    supheli: 'warning',
    sanik: 'danger',

    musteki: 'info',
    katilan: 'info',
    magdur: 'warning',
    maktul: 'default',

    alacakli: 'success',
    borclu: 'warning',

    ucuncu_kisi: 'default',
  };

  return (
    variants[type] ||
    'default'
  );
};

const getEntityTypeLabel = (
  type
) => {
  return type ===
    'company'
    ? 'Tüzel Kişi'
    : 'Gerçek Kişi';
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return '-';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(date);
};

// ======================================================
// COMPONENT
// ======================================================

const CasePartyDetail = () => {
  const {
    id,
    caseId,
  } =
    useParams();

  const {
    data,
    isLoading,
    error,
  } =
    useQuery({
      queryKey: [
        'case-party',
        id,
      ],

      queryFn: () =>
        casePartyApi.getOne(
          id
        ),

      enabled:
        Boolean(id),

      staleTime:
        2 * 60 * 1000,
    });

  const party =
    data?.data?.data ??
    data?.data ??
    null;

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

        <p className="text-sm text-gray-500">
          Taraf bilgileri yükleniyor...
        </p>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error ||
    !party
  ) {
    return (
      <div className="py-16 text-center">

        <Users className="mx-auto h-12 w-12 text-gray-300" />

        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Taraf bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Kayıt kaldırılmış veya erişilemiyor olabilir.
        </p>

        <Link
          to={`/cases/${caseId}`}
          className="mt-5 inline-block"
        >
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />

            Davaya Dön
          </Button>
        </Link>

      </div>
    );
  }

  // ====================================================
  // DERIVED
  // ====================================================

  const isCompany =
    party.entity_type ===
    'company';

  const identityNumber =
    party.identification_number ||
    party.tc_number ||
    null;

  const hasContact =
    party.phone ||
    party.email ||
    party.address;

  const hasLawyer =
    party.lawyer_name ||
    party.lawyer_phone ||
    party.lawyer_email ||
    party.lawyer_registry_number;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <Link
            to={`/cases/${caseId}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />

            Davaya Dön
          </Link>

          <div className="mt-4 flex items-start gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

              {isCompany ? (
                <Building2 className="h-6 w-6 text-blue-600" />
              ) : (
                <UserRound className="h-6 w-6 text-blue-600" />
              )}

            </div>

            <div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {party.name}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2">

                <Badge
                  variant={
                    getPartyTypeVariant(
                      party.party_type
                    )
                  }
                >
                  {getPartyTypeLabel(
                    party.party_type
                  )}
                </Badge>

                <Badge variant="default">
                  {getEntityTypeLabel(
                    party.entity_type
                  )}
                </Badge>

              </div>

            </div>

          </div>

        </div>

        <Link
          to={`/cases/${caseId}/parties/${party.id}/edit`}
        >
          <Button variant="outline">
            <Edit2 className="mr-2 h-4 w-4" />

            Düzenle
          </Button>
        </Link>

      </div>

      {/* ==================================================
          IDENTITY SUMMARY
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center gap-2">

            <Scale className="h-5 w-5 text-blue-600" />

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Taraf ve Kimlik Bilgileri
            </h2>

          </div>

        </Card.Header>

        <Card.Body>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Taraf Sıfatı
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {getPartyTypeLabel(
                  party.party_type
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Kişi Türü
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {getEntityTypeLabel(
                  party.entity_type
                )}
              </p>

            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {isCompany
                  ? 'Vergi Kimlik No'
                  : 'T.C. Kimlik No'}
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {identityNumber ||
                  '-'}
              </p>

            </div>

            {isCompany && (
              <div>

                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Vergi Dairesi
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {party.tax_office ||
                    '-'}
                </p>

              </div>
            )}

          </div>

        </Card.Body>

      </Card>

      {/* ==================================================
          CONTACT
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center gap-2">

            <Phone className="h-5 w-5 text-emerald-600" />

            <h2 className="font-semibold text-gray-900 dark:text-white">
              İletişim Bilgileri
            </h2>

          </div>

        </Card.Header>

        <Card.Body>

          {!hasContact ? (
            <p className="text-sm text-gray-400">
              İletişim bilgisi girilmemiş.
            </p>
          ) : (
            <div className="space-y-5">

              <div className="flex flex-wrap gap-2">

                {party.phone && (
                  <a
                    href={`tel:${party.phone}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <Phone className="h-4 w-4" />

                    {party.phone}
                  </a>
                )}

                {party.email && (
                  <a
                    href={`mailto:${party.email}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <Mail className="h-4 w-4" />

                    {party.email}
                  </a>
                )}

              </div>

              {party.address && (
                <div className="flex items-start gap-3">

                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Adres
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                      {party.address}
                    </p>

                  </div>

                </div>
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          LAWYER
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center gap-2">

            <Scale className="h-5 w-5 text-purple-600" />

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Vekil Bilgileri
            </h2>

          </div>

        </Card.Header>

        <Card.Body>

          {!hasLawyer ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center dark:border-gray-700">

              <p className="text-sm text-gray-400">
                Bu taraf için vekil bilgisi girilmemiş.
              </p>

            </div>
          ) : (
            <div className="space-y-5">

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Avukat
                  </p>

                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {party.lawyer_name ||
                      '-'}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Baro Sicil No
                  </p>

                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    {party.lawyer_registry_number ||
                      '-'}
                  </p>

                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    İletişim
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    {party.lawyer_phone && (
                      <a
                        href={`tel:${party.lawyer_phone}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Phone className="h-4 w-4" />

                        Telefon
                      </a>
                    )}

                    {party.lawyer_email && (
                      <a
                        href={`mailto:${party.lawyer_email}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Mail className="h-4 w-4" />

                        E-posta
                      </a>
                    )}

                  </div>

                </div>

              </div>

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          NOTES
      ================================================== */}

      {party.notes && (
        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <FileText className="h-5 w-5 text-amber-500" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                İç Not
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
              {party.notes}
            </p>

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          META
      ================================================== */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-2 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">

            <span>
              Kayıt oluşturulma: {formatDateTime(
                party.created_at
              )}
            </span>

            <span>
              Son güncelleme: {formatDateTime(
                party.updated_at
              )}
            </span>

          </div>

        </Card.Body>

      </Card>

    </div>
  );
};

export default CasePartyDetail;