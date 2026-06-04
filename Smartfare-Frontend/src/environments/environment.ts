const isAndroidApp = window.location.origin.includes('localhost:4200') === false;

export const environment = {
  production: false,
  apiUrl: isAndroidApp ? 'http://10.0.2.2:3000' : 'http://localhost:3000',
  siteUrl: 'http://localhost:4200'
};
