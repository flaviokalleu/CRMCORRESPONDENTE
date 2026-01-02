// src/pages/AddCliente.jsx
import React from 'react';
import MainLayout from '../layouts/MainLayout'; // Certifique-se de que o caminho está correto
import AddCliente from '../components/AddCliente'; // Certifique-se de que o caminho está correto

const AddClientePage = () => {
    return (
        <MainLayout>
            <AddCliente />
        </MainLayout>
    );
};

export default AddClientePage;
