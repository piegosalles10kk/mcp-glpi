// src/routes/ticketsRoutes.js
const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/ticketsController');

// Buscar tickets novos (não atribuídos)
router.get('/new', ticketsController.getNewTickets);

// Buscar tickets de um técnico específico
router.get('/technician/:technicianId', ticketsController.getTechnicianTickets);

module.exports = router;