import { useState, useEffect } from 'react';

export const useBrandName = () => {
    const [currentDomain, setCurrentDomain] = useState('.org');
    const domains = ['.org', '.ai'];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDomain((prev) => (prev === '.org' ? '.ai' : '.org'));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return `jobNinjas${currentDomain}`;
};
