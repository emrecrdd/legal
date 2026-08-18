import axios from '../../app/config/axios.js';
import { API_ROUTES } from '../../constants/apiRoutes.js';

const {
  DOCUMENTS,
} = API_ROUTES;

const documentApi = {
  // ======================================================
  // DOCUMENTS
  // ======================================================

  getAll: (params = {}) => {
    return axios.get(
      DOCUMENTS.GET_ALL,
      {
        params,
      }
    );
  },

  getOne: (id) => {
    return axios.get(
      DOCUMENTS.GET_ONE(id)
    );
  },

  // ======================================================
  // UPLOAD
  // ======================================================

  upload: (data) => {
    return axios.post(
      DOCUMENTS.UPLOAD,
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
      DOCUMENTS.UPLOAD_MULTIPLE,
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );
  },

  uploadVersion: (id, data) => {
    return axios.post(
      DOCUMENTS.UPLOAD_VERSION(id),
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );
  },

  // ======================================================
  // UPDATE / DELETE
  // ======================================================

  update: (id, data) => {
    return axios.patch(
      DOCUMENTS.UPDATE(id),
      data
    );
  },

  delete: (id) => {
    return axios.delete(
      DOCUMENTS.DELETE(id)
    );
  },

  // ======================================================
  // FILE ACCESS
  // ======================================================

  download: (id) => {
    return axios.get(
      DOCUMENTS.DOWNLOAD(id),
      {
        responseType:
          'blob',
      }
    );
  },

  preview: (id) => {
    return axios.get(
      DOCUMENTS.PREVIEW(id),
      {
        responseType:
          'blob',
      }
    );
  },

  // ======================================================
  // VERSIONS
  // ======================================================

  getVersions: (id) => {
    return axios.get(
      DOCUMENTS.VERSIONS(id)
    );
  },

  // ======================================================
  // META
  // ======================================================

  getCategories: () => {
    return axios.get(
      DOCUMENTS.CATEGORIES
    );
  },

  getStatistics: () => {
    return axios.get(
      DOCUMENTS.STATISTICS
    );
  },
};

export default documentApi;