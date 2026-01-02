// src/components/Footer.js

import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-black text-white py-4 mt-auto">
            <div className=" text-center">
                <p className="text-sm">
                    &copy; {new Date().getFullYear()} Flavio Kalleu. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
