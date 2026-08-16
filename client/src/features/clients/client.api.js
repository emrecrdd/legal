import axios from '../../app/config/axios.js';

const clientApi = {
  // ======================================================
  // CLIENTS
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      '/clients',
      {
        params,
      }
    );
  },

  getOne: (id) => {
    return axios.get(
      `/clients/${id}`
    );
  },

  create: (data) => {
    return axios.post(
      '/clients',
      data
    );
  },

  // Metadata / kısmi güncelleme
  update: (id, data) => {
    return axios.patch(
      `/clients/${id}`,
      data
    );
  },

  // Backend paranoid:true olduğu için soft-delete
  delete: (id) => {
    return axios.delete(
      `/clients/${id}`
    );
  },

  // ======================================================
  // STATISTICS
  // ======================================================

  getStatistics: () => {
    return axios.get(
      '/clients/statistics'
    );
  },

  // ======================================================
  // RELATED DATA
  // ======================================================

  getCaseHistory: (id) => {
    return axios.get(
      `/clients/${id}/cases`
    );
  },

  getPayments: (id) => {
    return axios.get(
      `/clients/${id}/payments`
    );
  },

  getNotes: (id) => {
    return axios.get(
      `/clients/${id}/notes`
    );
  },
};

export default clientApi;