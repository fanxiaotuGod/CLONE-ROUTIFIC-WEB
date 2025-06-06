import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import { ThemeProvider, Theme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(awsExports);

const theme: Theme = {
  name: 'routific-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#ccfbf1',
          20: '#99f6e4',
          40: '#5eead4',
          60: '#2dd4bf',
          80: '#0d9488',
          90: '#0f766e',
          100: '#134e4a',
        },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: { value: '{colors.brand.primary.80}' }, // Uses your teal color
          color: { value: 'white' },
          _hover: {
            backgroundColor: { value: '{colors.brand.primary.90}' }, // Darker on hover
          },
          _focus: {
            backgroundColor: { value: '{colors.brand.primary.90}' },
          },
        },
      },
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);