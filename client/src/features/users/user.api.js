import axios from '../../app/config/axios.js';

const userApi = {
  // ======================================================
  // LIST
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      '/users',
      {
        params,
      }
    );
  },

  // ======================================================
  // DETAIL
  // ======================================================

  getOne: (id) => {
    return axios.get(
      `/users/${id}`
    );
  },

  // ======================================================
  // CREATE
  // Admin only
  // ======================================================

  create: (data) => {
    return axios.post(
      '/users',
      data
    );
  },

  // ======================================================
  // LAWYERS
  // ======================================================

  getLawyers: () => {
    return axios.get(
      '/users',
      {
        params: {
          role: 'lawyer',
        },
      }
    );
  },

  // ======================================================
  // PROFILE UPDATE
  // Rol ve aktiflik burada değiştirilmez.
  // ======================================================

  update: (id, data) => {
    return axios.patch(
      `/users/${id}`,
      data
    );
  },

  // ======================================================
  // ROLE
  // ======================================================

  changeRole: (
    id,
    role
  ) => {
    return axios.patch(
      `/users/${id}/role`,
      {
        role,
      }
    );
  },

  // ======================================================
  // ACTIVE / PASSIVE
  // Backend mevcut değeri toggle ediyor.
  // ======================================================

  toggleActive: (id) => {
    return axios.patch(
      `/users/${id}/toggle-active`
    );
  },

  // ======================================================
  // DELETE
  // ======================================================

  delete: (id) => {
    return axios.delete(
      `/users/${id}`
    );
  },
};

export default userApi;