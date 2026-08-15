import axios from '../../app/config/axios.js';

const documentApi = {
  getAll: (params) => {
    return axios.get('/documents', {
      params,
    });
  },

  getOne: (id) => {
    return axios.get(
      `/documents/${id}`
    );
  },

  upload: (data) => {
    return axios.post(
      '/documents/upload',
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );
  },

  uploadMultiple: (data) => {
    return axios.post(
      '/documents/upload-multiple',
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );
  },

  // ✅ Yeni belge versiyonu yükle
  uploadVersion: (id, data) => {
    return axios.post(
      `/documents/${id}/versions`,
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );
  },

  // ✅ Metadata update
  // Backend PATCH destekliyor.
  update: (id, data) => {
    return axios.patch(
      `/documents/${id}`,
      data
    );
  },

  delete: (id) => {
    return axios.delete(
      `/documents/${id}`
    );
  },

  download: (id) => {
    return axios.get(
      `/documents/${id}/download`,
      {
        responseType: 'blob',
      }
    );
  },

  // ✅ Tarayıcı içinde önizleme için
  preview: (id) => {
    return axios.get(
      `/documents/${id}/preview`,
      {
        responseType: 'blob',
      }
    );
  },

  getVersions: (id) => {
    return axios.get(
      `/documents/${id}/versions`
    );
  },

  getCategories: () => {
    return axios.get(
      '/documents/categories'
    );
  },

  getStatistics: () => {
    return axios.get(
      '/documents/statistics'
    );
  },
};

export default documentApi;