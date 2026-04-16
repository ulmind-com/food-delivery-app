const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidUPIQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    const queries = [
      {
        package: [
          { $: { 'android:name': 'com.google.android.apps.nbu.paisa.user' } }, // Google Pay
          { $: { 'android:name': 'com.phonepe.app' } }, // PhonePe
          { $: { 'android:name': 'net.one97.paytm' } }, // Paytm
          { $: { 'android:name': 'in.org.npci.upiapp' } }, // BHIM
          { $: { 'android:name': 'com.dreamplug.androidapp' } } // CRED
        ],
        intent: [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
            data: [{ $: { 'android:scheme': 'upi' } }],
          },
        ],
      },
    ];

    androidManifest.queries = queries;

    return config;
  });
};

module.exports = withAndroidUPIQueries;
