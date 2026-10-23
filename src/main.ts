import './style.css';
if (new URLSearchParams(location.search).get('mode') === 'classic') void import('./classic');
else void import('./simulation/app');
