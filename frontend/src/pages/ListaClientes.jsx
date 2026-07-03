import React from 'react';
import MainLayout from '../layouts/MainLayout'; // Certifique-se de que o caminho está correto
import ListaClientes from '../components/ListaClientes'; // Atualize o caminho para ListaClientes

const ListaClientesPage = () => {
    return (
        <MainLayout>
            <ListaClientes />
        </MainLayout>
    );
}

export default ListaClientesPage;
