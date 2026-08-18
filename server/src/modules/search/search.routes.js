import express from 'express';

import {
  searchController,
} from './search.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router =
  express.Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// SEARCH PERMISSION
//
// Tüm arama modülü USE_SEARCH yetkisi ister.
// Kullanıcı bazlı override burada devreye girer.
// ======================================================

router.use(
  authorizePermission(
    PERMISSION_KEYS.USE_SEARCH
  )
);

// ======================================================
// SEARCH
// ======================================================

router.get(
  '/',
  searchController.search
);

router.get(
  '/all',
  searchController.searchAll
);

router.get(
  '/clients',
  searchController.searchClients
);

router.get(
  '/cases',
  searchController.searchCases
);

router.get(
  '/documents',
  searchController.searchDocuments
);

router.get(
  '/tasks',
  searchController.searchTasks
);

router.get(
  '/suggestions',
  searchController.getSearchSuggestions
);

export {
  router as searchRoutes,
};