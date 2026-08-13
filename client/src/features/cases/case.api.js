import axios from '../../app/config/axios.js';

const caseApi = {
  getAll: (params) => {
    return axios.get('/cases', { params });
  },

  getOne: (id) => {
    return axios.get(`/cases/${id}`);
  },

  create: (data) => {
    return axios.post('/cases', data);
  },

  // Normal tam güncelleme
  update: (id, data) => {
    return axios.put(`/cases/${id}`, data);
  },

  // AI önerilerinde sadece seçilen alanları güncelle
  // Diğer dava alanlarına dokunmaz
  patch: (id, data) => {
    return axios.patch(`/cases/${id}`, data);
  },

  delete: (id) => {
    return axios.delete(`/cases/${id}`);
  },

  updateStatus: (id, status) => {
    return axios.patch(`/cases/${id}/status`, { status });
  },

  getStatistics: () => {
    return axios.get('/cases/statistics');
  },

  getParties: (id) => {
    return axios.get(`/cases/${id}/parties`);
  },

  addParty: (id, data) => {
    return axios.post(`/cases/${id}/parties`, data);
  },

  removeParty: (id, partyId) => {
    return axios.delete(`/cases/${id}/parties/${partyId}`);
  },

  getDocuments: (id) => {
    return axios.get(`/cases/${id}/documents`);
  },

  getTasks: (id) => {
    return axios.get(`/cases/${id}/tasks`);
  },

  getEvents: (id) => {
    return axios.get(`/cases/${id}/events`);
  },

  getPayments: (id) => {
    return axios.get(`/cases/${id}/payments`);
  },

  getNotes: (id) => {
    return axios.get(`/cases/${id}/notes`);
  },
};

export default caseApi;