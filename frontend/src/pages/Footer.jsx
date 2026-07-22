// src/components/Footer.js

import React from 'react';

const Footer = () => {
    return (
        <footer className='bg-gray-800 text-white py-4 mt-6'>
            <div className='container mx-auto text-center'>
                <p className='text-sm'>
                    &copy; {new Date().getFullYear()} Flavio Kalleu. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
