// frontend/src/pages/ListaCorrespondentesPage.jsx
import React from 'react';
import MainLayout from '../layouts/MainLayout'; // Certifique-se de que o caminho está correto
import ListaCorrespondentes from '../components/ListaCorrespondentes'; // Atualize o caminho para ListaCorrespondentes

const ListaCorrespondentesPage = () => {
    return (
        <MainLayout>
            <ListaCorrespondentes />
        </MainLayout>
    );
}

export default ListaCorrespondentesPage;
