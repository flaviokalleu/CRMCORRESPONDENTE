import React from 'react';

const ReceitaList = ({ receitas, onEdit, onDelete }) => (
  <table className="min-w-full border mt-4">
    <thead>
      <tr>
        <th className="border px-2">Tipo</th>
        <th className="border px-2">Valor</th>
        <th className="border px-2">Descrição</th>
        <th className="border px-2">Data</th>
        <th className="border px-2">Ações</th>
      </tr>
    </thead>
    <tbody>
      {receitas.map((r) => (
        <tr key={r.id}>
          <td className="border px-2">{r.tipo}</td>
          <td className="border px-2">R$ {Number(r.valor).toFixed(2)}</td>
          <td className="border px-2">{r.descricao}</td>
          <td className="border px-2">{r.data}</td>
          <td className="border px-2">
            <button onClick={() => onEdit(r)} className="text-blue-600 mr-2">Editar</button>
            <button onClick={() => onDelete(r.id)} className="text-red-600">Excluir</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default ReceitaList;
