
import React, { useEffect, useState } from 'react';
import DespesaForm from '../../components/financeiro/DespesaForm';
import DespesaList from '../../components/financeiro/DespesaList';
import api from '../../services/api';
import MainLayout from '../../layouts/MainLayout';

const DespesaPage = () => {
  const [despesas, setDespesas] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  const fetchDespesas = async () => {
    const { data } = await api.get('/despesas');
    setDespesas(data);
  };

  useEffect(() => {
    fetchDespesas();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api.put(`/despesas/${editId}`, form);
    } else {
      await api.post('/despesas', form);
    }
    setForm({});
    setEditId(null);
    fetchDespesas();
  };

  const handleEdit = (despesa) => {
    setForm(despesa);
    setEditId(despesa.id);
  };

  const handleDelete = async (id) => {
    await api.delete(`/despesas/${id}`);
    fetchDespesas();
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Despesas</h2>
        <DespesaForm onSubmit={handleSubmit} despesa={form} onChange={handleChange} />
        <DespesaList despesas={despesas} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </MainLayout>
  );
};

export default DespesaPage;
