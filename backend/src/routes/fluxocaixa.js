const express = require('express');
const router = express.Router();
const fluxoCaixaController = require('../controllers/fluxocaixaController');


// Dashboard financeiro
router.get('/dashboard', fluxoCaixaController.dashboard);

router.post('/', fluxoCaixaController.create);
router.get('/', fluxoCaixaController.list);
router.get('/:id', fluxoCaixaController.get);
router.put('/:id', fluxoCaixaController.update);
router.delete('/:id', fluxoCaixaController.delete);

module.exports = router;
