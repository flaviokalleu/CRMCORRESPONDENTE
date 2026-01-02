import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Videos from '../components/Videos';

const VideosPage = () => {
    return (
        <div className='flex'>
            <Sidebar />
            <div className='flex-1'>
                <Navbar />
                <Videos />
            </div>
        </div>
    );
}

export default VideosPage;
