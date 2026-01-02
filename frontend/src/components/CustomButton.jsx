import React from 'react';
import Button from '@mui/material/Button';

const CustomButton = (props) => (
    <Button
        {...props}
        variant="contained"
        color="primary"
        style={{ backgroundColor: '#1e88e5' }}
    />
);

export default CustomButton;
