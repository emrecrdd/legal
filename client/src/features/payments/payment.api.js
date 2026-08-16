import axios from '../../app/config/axios.js';

const paymentApi = {
  // ======================================================
  // PAYMENTS
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      '/payments',
      {
        params,
      }
    );
  },

  getOne: (id) => {
    return axios.get(
      `/payments/${id}`
    );
  },

  create: (data) => {
    return axios.post(
      '/payments',
      data
    );
  },

  update: (id, data) => {
    return axios.patch(
      `/payments/${id}`,
      data
    );
  },

  remove: (id) => {
    return axios.delete(
      `/payments/${id}`
    );
  },

  reverse: (
    id,
    data
  ) => {
    return axios.post(
      `/payments/${id}/reverse`,
      data
    );
  },

  getByClient: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      `/payments/client/${clientId}`,
      {
        params,
      }
    );
  },

  getByCase: (
    caseId,
    params = {}
  ) => {
    return axios.get(
      `/payments/case/${caseId}`,
      {
        params,
      }
    );
  },

  // ======================================================
  // PAYMENT PLANS
  // ======================================================

  getPlans: (
    params = {}
  ) => {
    return axios.get(
      '/payments/plans',
      {
        params,
      }
    );
  },

  getPlan: (id) => {
    return axios.get(
      `/payments/plans/${id}`
    );
  },

  createPlan: (
    data
  ) => {
    return axios.post(
      '/payments/plans',
      data
    );
  },

  activatePlan: (
    id
  ) => {
    return axios.patch(
      `/payments/plans/${id}/activate`
    );
  },

  cancelPlan: (
    id,
    reason
  ) => {
    return axios.patch(
      `/payments/plans/${id}/cancel`,
      {
        reason,
      }
    );
  },

  // ======================================================
  // SUMMARY
  // ======================================================

  // Tüm sistemin finans özeti
  getSummary: () => {
    return axios.get(
      '/payments/summary'
    );
  },

  // Tek müvekkilin finans özeti
  getClientSummary: (
    clientId
  ) => {
    return axios.get(
      `/payments/client/${clientId}/summary`
    );
  },
};

export default paymentApi;