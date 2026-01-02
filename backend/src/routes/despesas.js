const express = require('express');
const router = express.Router();
const despesaController = require('../controllers/despesaController');

router.post('/', despesaController.create);
router.get('/', despesaController.list);
router.get('/:id', despesaController.get);
router.put('/:id', despesaController.update);
router.delete('/:id', despesaController.delete);

module.exports = router;
