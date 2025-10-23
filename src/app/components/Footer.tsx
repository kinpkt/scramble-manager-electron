'use client';

import { Container } from 'react-bootstrap';
import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-dark text-center text-light py-3 mt-auto">
            <Container>
                &copy; {new Date().getFullYear()} by Phakinthorn Pronmongkolsuk. All rights reserved.
            </Container>
        </footer>
    );
};

export default Footer;
