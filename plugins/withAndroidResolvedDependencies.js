const { withAppBuildGradle } = require("@expo/config-plugins");

const withExcludeSupport = (config) => {
  return withAppBuildGradle(config, (config) => {
    // We are deliberately replacing the dependencies block to inject configurations.all
    // so it executes globally across all build variants and excludes legacy libs.
    const searchString = "dependencies {";
    const excludeBlock = `
    configurations.all {
        exclude group: 'com.android.support', module: 'support-v4'
        exclude group: 'com.android.support', module: 'appcompat-v7'
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-core-utils' 
        exclude group: 'com.android.support', module: 'support-core-ui'
        exclude group: 'com.android.support', module: 'support-fragment'
    }
`;

    // Only inject if it hasn't been injected before
    if (!config.modResults.contents.includes("exclude group: 'com.android.support'")) {
      config.modResults.contents = config.modResults.contents.replace(
        searchString,
        `${excludeBlock}\n${searchString}`
      );
    }
    
    return config;
  });
};

module.exports = withExcludeSupport;
