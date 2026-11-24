/* Webzombite public settings. Public values only (never put secret keys here). */
window.WZ_CONFIG = {
  appName: 'Webzombite',
  supabaseUrl: 'https://wjwzwuxklszojemvtplj.supabase.co',
  supabaseKey: 'sb_publishable_S9c8P9FaWEcjU6yNkO8OEg_aNoXym3k',
  coreUrl: 'https://best-xking-all-platforms-core-web.louisstevenhrt05.workers.dev/',
  maxPlayers: 4,
  /* Creative mode needs TWO passwords (SHA-256 hashes). Change them: open the game, press F12 and run  WZ.sha256('your password')  then paste the result here. */
  creative: { h1: 'f62527d99052823d1f5b8f931075d619e8a684c66a248b2efcb7747183e9f439', h2: 'd98a3bd54d024740a4685e127942f37e5e0351e570b677fa7c85fc47c279f5a2' },
  mqttBrokers: [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt'
  ]
};
