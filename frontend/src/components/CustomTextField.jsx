import React from 'react';
import TextField from '@mui/material/TextField';

const CustomTextField = (props) => (
    <TextField
        {...props}
        fullWidth
        variant="outlined"
        margin="normal"
        InputProps={{
            style: { backgroundColor: '#1e1e1e', color: '#fff' },
        }}
        InputLabelProps={{
            style: { color: '#fff' },
        }}
    />
);

export default CustomTextField;
