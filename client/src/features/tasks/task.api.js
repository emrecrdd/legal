import axios from '../../app/config/axios.js';

const taskApi = {
  // ======================================================
  // LIST
  // ======================================================

  getAll: (params = {}) => {
    return axios.get('/tasks', {
      params,
    });
  },

  // ======================================================
  // DETAIL
  // ======================================================

  getOne: (id) => {
    return axios.get(
      `/tasks/${id}`
    );
  },

  // ======================================================
  // CREATE
  // ======================================================

  create: (data) => {
    return axios.post(
      '/tasks',
      data
    );
  },

  // ======================================================
  // UPDATE
  // ======================================================

  update: (id, data) => {
    return axios.put(
      `/tasks/${id}`,
      data
    );
  },

  // ======================================================
  // DELETE
  // ======================================================

  delete: (id) => {
    return axios.delete(
      `/tasks/${id}`
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
      `/tasks/${id}/status`,
      {
        status,
      }
    );
  },

  // ======================================================
  // ASSIGN
  // ======================================================

  assignTask: (
    id,
    assigned_to
  ) => {
    return axios.patch(
      `/tasks/${id}/assign`,
      {
        assigned_to,
      }
    );
  },

  // ======================================================
  // MY TASKS
  // ======================================================

  getMyTasks: (
    params = {}
  ) => {
    return axios.get(
      '/tasks/my',
      {
        params,
      }
    );
  },

  getMyOverdue: () => {
    return axios.get(
      '/tasks/my/overdue'
    );
  },

  getMyUpcoming: () => {
    return axios.get(
      '/tasks/my/upcoming'
    );
  },

  // ======================================================
  // STATISTICS
  // ======================================================

  getStatistics: () => {
    return axios.get(
      '/tasks/statistics'
    );
  },

  // ======================================================
  // CLIENT TASKS
  //
  // Tüm müvekkil görevleri - paginated
  //
  // params:
  // {
  //   page,
  //   limit,
  //   status
  // }
  // ======================================================

  getByClient: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      `/tasks/client/${clientId}`,
      {
        params,
      }
    );
  },

  // ======================================================
  // CLIENT COCKPIT OVERVIEW
  //
  // params:
  // {
  //   active_limit,
  //   recent_limit
  // }
  // ======================================================

  getClientOverview: (
    clientId,
    params = {}
  ) => {
    return axios.get(
      `/tasks/client/${clientId}/overview`,
      {
        params,
      }
    );
  },

  // ======================================================
  // START
  // ======================================================

  startTask: (id) => {
    return axios.post(
      `/tasks/${id}/start`
    );
  },

  // ======================================================
  // COMPLETE
  // ======================================================

  completeTask: (
    id,
    data
  ) => {
    return axios.post(
      `/tasks/${id}/complete`,
      data
    );
  },

  // ======================================================
  // PROGRESS
  // ======================================================

  updateProgress: (
    id,
    progress
  ) => {
    return axios.patch(
      `/tasks/${id}/progress`,
      {
        progress,
      }
    );
  },

  // ======================================================
  // APPROVE
  // ======================================================

  approveTask: (id) => {
    return axios.post(
      `/tasks/${id}/approve`
    );
  },

  // ======================================================
  // NOTES
  // ======================================================

  addNote: (
    id,
    content
  ) => {
    return axios.post(
      `/tasks/${id}/notes`,
      {
        content,
      }
    );
  },

  getNotes: (id) => {
    return axios.get(
      `/tasks/${id}/notes`
    );
  },
};

export default taskApi;