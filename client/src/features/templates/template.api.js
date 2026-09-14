import axios from '../../app/config/axios.js';

// ======================================================
// TEMPLATE API
// ======================================================

export const templateApi = {
  // ====================================================
  // LIST / DETAIL
  // ====================================================

  getAll: (params = {}) => {
    return axios.get('/templates', {
      params,
    });
  },

  getOne: (id) => {
    return axios.get(`/templates/${id}`);
  },

  // ====================================================
  // META
  // ====================================================

  getCategories: () => {
    return axios.get('/templates/categories');
  },

  getLawAreas: () => {
    return axios.get('/templates/law-areas');
  },

  // ====================================================
  // CREATE
  // ====================================================

  /*
   * data = FormData
   *
   * Content-Type'ı elle vermiyoruz.
   * Browser/Axios multipart boundary değerini
   * otomatik oluşturur.
   */
  create: (data) => {
    return axios.post('/templates', data);
  },

  // ====================================================
  // UPDATE
  // ====================================================

  /*
   * data = FormData
   *
   * multipart/form-data header'ını
   * elle vermiyoruz.
   */
  update: (id, data) => {
    return axios.put(`/templates/${id}`, data);
  },

  // ====================================================
  // DELETE
  // ====================================================

  delete: (id) => {
    return axios.delete(`/templates/${id}`);
  },

  // ====================================================
  // DOWNLOAD
  // ====================================================

  /*
   * Orijinal şablon dosyasını indirir.
   *
   * PDF, Word, Excel, image, UDF vb.
   * tamamı blob olarak alınır.
   */
  download: (id) => {
    return axios.get(`/templates/${id}/download`, {
      responseType: 'blob',
    });
  },

  // ====================================================
  // STANDARD PREVIEW
  // ====================================================

  /*
   * Browser'ın doğrudan gösterebildiği dosyalar:
   *
   * - PDF
   * - JPG / JPEG
   * - PNG
   * - GIF
   * - WEBP
   *
   * Backend binary response döndürür.
   */
  preview: (id) => {
    return axios.get(`/templates/${id}/preview`, {
      responseType: 'blob',
    });
  },

  // ====================================================
  // UDF PREVIEW
  // ====================================================

  /*
   * UYAP .udf dosyası backend tarafından parse edilir.
   *
   * JSON response döndüğü için
   * responseType: 'blob' kullanılmaz.
   */
  udfPreview: (id) => {
    return axios.get(`/templates/${id}/udf-preview`);
  },

  // ====================================================
  // OFFICE PREVIEW
  // ====================================================

  /*
   * Desteklenen Office dosyaları:
   *
   * - DOCX
   * - XLS
   * - XLSX
   *
   * Backend:
   *
   * DOCX
   * -> sanitize edilmiş HTML
   *
   * XLS / XLSX
   * -> sheet + rows JSON verisi
   *
   * döndürür.
   *
   * JSON response olduğu için
   * responseType: 'blob' kullanılmaz.
   */
  officePreview: (id) => {
    return axios.get(`/templates/${id}/office-preview`);
  },
};

export default templateApi;