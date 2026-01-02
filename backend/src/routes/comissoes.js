const express = require('express');
const router = express.Router();
const comissaoController = require('../controllers/comissaoController');

router.post('/', comissaoController.create);
router.get('/', comissaoController.list);
router.get('/:id', comissaoController.get);
router.put('/:id', comissaoController.update);
router.delete('/:id', comissaoController.delete);

module.exports = router;
