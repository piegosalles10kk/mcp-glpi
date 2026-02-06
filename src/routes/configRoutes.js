// src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// Salvar configurações GLPI
router.post('/glpi', configController.saveGlpiConfig);

// Buscar configurações GLPI
router.get('/glpi', configController.getGlpiConfig);

// Testar conexão GLPI
router.post('/glpi/test', configController.testGlpiConnection);

// Adicionar técnico ao dashboard
router.post('/dashboard/technicians', configController.addTechnicianToDashboard);

// Remover técnico do dashboard
router.delete('/dashboard/technicians/:technicianId', configController.removeTechnicianFromDashboard);

module.exports = router;