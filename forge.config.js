const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    // Best practice fuses configuration for security hardening
    // These settings protect against common attack vectors while allowing external content loading
    new FusesPlugin({
      version: FuseVersion.V1,
      // Security: Disable running Node.js from renderer process
      [FuseV1Options.RunAsNode]: false,
      // Security: Enable cookie encryption at rest
      [FuseV1Options.EnableCookieEncryption]: true,
      // Security: Disable NODE_OPTIONS environment variable to prevent injection attacks
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      // Security: Disable Node CLI inspect arguments to prevent remote debugging
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      // Security: Enable ASAR integrity validation to prevent tampering
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // Security: Only load application code from ASAR archive
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      // Performance: Use browser-specific V8 snapshot for faster startup
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: true,
      // Security: Remove extra privileges from file:// protocol
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
    }),
  ],
};
