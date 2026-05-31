function fn() {
  var config = {
    baseUrl: karate.properties['baseUrl'] || 'http://localhost:4000/graphql',
  };

  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 5000);

  return config;
}
