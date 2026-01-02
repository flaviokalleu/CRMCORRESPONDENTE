import React from 'react';

const DespesaForm = ({ onSubmit, despesa, onChange }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <label>Tipo</label>
      <select name="tipo" value={despesa.tipo || ''} onChange={onChange} required className="block w-full border rounded p-2">
        <option value="">Selecione</option>
        <option value="operacional">Operacional</option>
        <option value="comissao">Comissão</option>
        <option value="imposto">Imposto</option>
        <option value="manutencao">Manutenção</option>
      </select>
    </div>
    <div>
      <label>Valor</label>
      <input type="number" name="valor" value={despesa.valor || ''} onChange={onChange} required className="block w-full border rounded p-2" step="0.01" />
    </div>
    <div>
      <label>Descrição</label>
      <input type="text" name="descricao" value={despesa.descricao || ''} onChange={onChange} className="block w-full border rounded p-2" />
    </div>
    <div>
      <label>Data</label>
      <input type="date" name="data" value={despesa.data || ''} onChange={onChange} required className="block w-full border rounded p-2" />
    </div>
    <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">Salvar</button>
  </form>
);

export default DespesaForm;
