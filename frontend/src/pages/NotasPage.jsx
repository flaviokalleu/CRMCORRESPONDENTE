import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Notas from '../components/Notas';

const NotasPage = () => {
    return (
        <div className='flex'>
            <Sidebar />
            <div className='flex-1'>
                <Navbar />
                <Notas />
            </div>
        </div>
    );
}

export default NotasPage;
