import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Processos from '../components/Processos';

const ProcessosPage = () => {
    return (
        <div className='flex'>
            <Sidebar />
            <div className='flex-1'>
                <Navbar />
                <Processos />
            </div>
        </div>
    );
}

export default ProcessosPage;
