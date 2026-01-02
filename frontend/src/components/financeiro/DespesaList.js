import React from 'react';

const DespesaList = ({ despesas, onEdit, onDelete }) => (
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
      {despesas.map((d) => (
        <tr key={d.id}>
          <td className="border px-2">{d.tipo}</td>
          <td className="border px-2">R$ {Number(d.valor).toFixed(2)}</td>
          <td className="border px-2">{d.descricao}</td>
          <td className="border px-2">{d.data}</td>
          <td className="border px-2">
            <button onClick={() => onEdit(d)} className="text-blue-600 mr-2">Editar</button>
            <button onClick={() => onDelete(d.id)} className="text-red-600">Excluir</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default DespesaList;
