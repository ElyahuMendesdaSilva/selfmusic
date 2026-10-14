const allowCleartext = process.env.EAS_BUILD_PROFILE !== 'production';

module.exports = ({ config }) => {
  const next = { ...config };
  if (allowCleartext) {
    next.plugins = [
      ...(next.plugins || []),
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    ];
    next.ios = {
      ...next.ios,
      infoPlist: {
        ...next.ios?.infoPlist,
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      },
    };
  }
  return next;
};
