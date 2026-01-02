
import React, { useEffect, useState } from 'react';
import ReceitaForm from '../../components/financeiro/ReceitaForm';
import ReceitaList from '../../components/financeiro/ReceitaList';
import api from '../../services/api';
import MainLayout from '../../layouts/MainLayout';

const ReceitaPage = () => {
  const [receitas, setReceitas] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  const fetchReceitas = async () => {
    const { data } = await api.get('/receitas');
    setReceitas(data);
  };

  useEffect(() => {
    fetchReceitas();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api.put(`/receitas/${editId}`, form);
    } else {
      await api.post('/receitas', form);
    }
    setForm({});
    setEditId(null);
    fetchReceitas();
  };

  const handleEdit = (receita) => {
    setForm(receita);
    setEditId(receita.id);
  };

  const handleDelete = async (id) => {
    await api.delete(`/receitas/${id}`);
    fetchReceitas();
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Receitas</h2>
        <ReceitaForm onSubmit={handleSubmit} receita={form} onChange={handleChange} />
        <ReceitaList receitas={receitas} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </MainLayout>
  );
};

export default ReceitaPage;
