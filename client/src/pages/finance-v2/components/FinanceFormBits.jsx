import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clientApi from '../../../features/clients/client.api.js';
import consultationApi from '../../../features/consultations/consultation.api.js';

export const inputClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white';

export function Field({ label, children, full, hint }) {
  return (
    <label className={`space-y-2 ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {label}
      </span>

      {children}

      {hint && (
        <span className="block text-xs text-gray-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`${inputClass} ${props.className || ''}`}
    >
      {props.children}
    </select>
  );
}

export const toIso = (value) =>
  value ? new Date(value).toISOString() : undefined;

export const today = () =>
  new Date().toISOString().slice(0, 10);

export const nowLocal = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();

  return new Date(d.getTime() - off * 60000)
    .toISOString()
    .slice(0, 16);
};

export const rows = (response) => {
  const data =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

export const clientName = (c) =>
  c?.name ||
  c?.full_name ||
  c?.company_name ||
  c?.title ||
  c?.id;

export const caseName = (c) =>
  c?.case_number ||
  c?.title ||
  c?.subject ||
  c?.id;

export const consultationName = (c) =>
  [c?.reference_no, c?.title || c?.subject]
    .filter(Boolean)
    .join(' · ') ||
  c?.id;

export function useFinanceContexts(clientId) {
  const clientsQ = useQuery({
    queryKey: ['clients', 'finance-v2-select'],
    queryFn: () =>
      clientApi.getAll({
        page: 1,
        limit: 200,
        status: 'active',
      }),
    staleTime: 300000,
  });

  const casesQ = useQuery({
    queryKey: [
      'clients',
      clientId,
      'finance-v2-cases',
    ],
    queryFn: () =>
      clientApi.getCaseHistory(clientId),
    enabled: Boolean(clientId),
    staleTime: 180000,
  });

  const consultationsQ = useQuery({
    queryKey: [
      'consultations',
      'finance-v2-select',
    ],
    queryFn: () =>
      consultationApi.getAll({
        page: 1,
        limit: 200,
      }),
    staleTime: 180000,
  });

  const clients = rows(clientsQ.data);
  const cases = rows(casesQ.data);

  // Prospect danışmanlıkların da finans içinde seçilebilmesi için
  // client_id bazlı filtre uygulanmıyor.
  const consultations = useMemo(
    () => rows(consultationsQ.data),
    [consultationsQ.data]
  );

  return {
    clients,
    cases,
    consultations,
    loading:
      clientsQ.isLoading ||
      casesQ.isLoading ||
      consultationsQ.isLoading,
  };
}

export function ContextFields({
  form,
  setForm,
  allowEmpty = false,
}) {
  const {
    clients,
    cases,
    consultations,
  } = useFinanceContexts(form.client_id);

  const set = (name, value) =>
    setForm((x) => ({
      ...x,
      [name]: value,

      ...(name === 'client_id'
        ? {
            case_id: '',
            consultation_id: '',
          }
        : {}),

      ...(name === 'case_id' && value
        ? {
            consultation_id: '',
          }
        : {}),

      ...(name === 'consultation_id' && value
        ? {
            case_id: '',
          }
        : {}),
    }));

  return (
    <>
      <Field label="Müvekkil">
        <Select
          required={!allowEmpty}
          value={form.client_id || ''}
          onChange={(e) =>
            set('client_id', e.target.value)
          }
        >
          <option value="">
            {allowEmpty
              ? 'Bağlanmadı'
              : 'Müvekkil seçin'}
          </option>

          {clients.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {clientName(c)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Dava">
        <Select
          value={form.case_id || ''}
          onChange={(e) =>
            set('case_id', e.target.value)
          }
        >
          <option value="">
            Dava seçilmedi
          </option>

          {cases.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {caseName(c)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Danışmanlık">
        <Select
          value={form.consultation_id || ''}
          onChange={(e) =>
            set(
              'consultation_id',
              e.target.value
            )
          }
        >
          <option value="">
            Danışmanlık seçilmedi
          </option>

          {consultations.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {consultationName(c)}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}