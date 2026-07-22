import React from 'react';

const ReceitaForm = ({ onSubmit, receita, onChange }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <label>Tipo</label>
      <select name="tipo" value={receita.tipo || ''} onChange={onChange} required className="block w-full border rounded p-2">
        <option value="">Selecione</option>
        <option value="venda">Venda</option>
        <option value="aluguel">Aluguel</option>
        <option value="taxa">Taxa Administrativa</option>
      </select>
    </div>
    <div>
      <label>Valor</label>
      <input type="number" name="valor" value={receita.valor || ''} onChange={onChange} required className="block w-full border rounded p-2" step="0.01" />
    </div>
    <div>
      <label>Descrição</label>
      <input type="text" name="descricao" value={receita.descricao || ''} onChange={onChange} className="block w-full border rounded p-2" />
    </div>
    <div>
      <label>Data</label>
      <input type="date" name="data" value={receita.data || ''} onChange={onChange} required className="block w-full border rounded p-2" />
    </div>
    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button>
  </form>
);

export default ReceitaForm;
