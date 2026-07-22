import React from 'react';
import MainLayout from '../layouts/MainLayout'; // Certifique-se de que o caminho está correto
import ListaCorretores from '../components/ListaCorretores'; // Atualize o caminho para ListaCorretores

const ListaCorretoresPage = () => {
    return (
        <MainLayout>
            <ListaCorretores />
        </MainLayout>
    );
}

export default ListaCorretoresPage;
