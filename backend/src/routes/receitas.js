const express = require('express');
const router = express.Router();
const receitaController = require('../controllers/receitaController');

router.post('/', receitaController.create);
router.get('/', receitaController.list);
router.get('/:id', receitaController.get);
router.put('/:id', receitaController.update);
router.delete('/:id', receitaController.delete);

module.exports = router;
