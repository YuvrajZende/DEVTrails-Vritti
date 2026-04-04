module.exports = () => ({
  expo: {
    name: 'VrittiApp',
    slug: 'VrittiApp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#0A1628',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiBase: process.env.EXPO_PUBLIC_API_BASE || '',
    },
  },
});
