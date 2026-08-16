import axios from '../../app/config/axios.js';

const meetingApi = {
  // ======================================================
  // LIST
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      '/meetings',
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
      `/meetings/${id}`
    );
  },

  // ======================================================
  // CREATE
  // ======================================================

  create: (data) => {
    return axios.post(
      '/meetings',
      data
    );
  },

  // ======================================================
  // UPDATE
  // ======================================================

  update: (id, data) => {
    return axios.put(
      `/meetings/${id}`,
      data
    );
  },

  // ======================================================
  // DELETE
  // ======================================================

  delete: (id) => {
    return axios.delete(
      `/meetings/${id}`
    );
  },

  // ======================================================
  // STATUS
  // ======================================================

  updateStatus: (
    id,
    status
  ) => {
    return axios.patch(
      `/meetings/${id}/status`,
      {
        status,
      }
    );
  },

  // ======================================================
  // MY MEETINGS
  // Pagination destekli.
  //
  // params:
  // {
  //   page,
  //   limit,
  //   include_completed
  // }
  // ======================================================

  getMyMeetings: (
    params = {}
  ) => {
    return axios.get(
      '/meetings/my',
      {
        params,
      }
    );
  },

  // ======================================================
  // UPCOMING
  //
  // params:
  // {
  //   limit
  // }
  // ======================================================

  getUpcoming: (
    params = {}
  ) => {
    return axios.get(
      '/meetings/upcoming',
      {
        params,
      }
    );
  },

  // ======================================================
  // BY CASE
  //
  // params:
  // {
  //   page,
  //   limit
  // }
  // ======================================================

  getByCase: (
    caseId,
    params = {}
  ) => {
    return axios.get(
      `/meetings/case/${caseId}`,
      {
        params,
      }
    );
  },

  // ======================================================
  // BY CLIENT
  //
  // Tüm toplantı geçmişi.
  // Pagination destekli.
  //
  // params:
  // {
  //   page,
  //   limit
  // }
  // ======================================================

  getByClient: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      `/meetings/client/${clientId}`,
      {
        params,
      }
    );
  },

  // ======================================================
  // CLIENT COCKPIT TIMELINE
  //
  // Müvekkil detay ekranı için optimize endpoint.
  //
  // params:
  // {
  //   upcoming_limit,
  //   recent_limit
  // }
  // ======================================================

  getClientTimeline: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      `/meetings/client/${clientId}/timeline`,
      {
        params,
      }
    );
  },
};

export default meetingApi;