import React from 'react';
import MainLayout from '../layouts/MainLayout'; // Corrija o caminho se necessário
import ListaImoveis from '../components/ListaImoveis'; // Certifique-se de que o caminho para ListaImoveis está correto

const ListaImoveisPage = () => {
    return (
        <MainLayout>
            <ListaImoveis />
        </MainLayout>
    );
}

export default ListaImoveisPage;
