function fn() {
  return {
    baseUrl: karate.properties["baseUrl"] || "http://localhost:4000/graphql",
    adminEmail: karate.properties["adminEmail"] || "admin@sgs.golf",
    adminPassword: karate.properties["adminPassword"] || "Admin123!",
    memberEmail: karate.properties["memberEmail"] || "jared@sgs.golf",
    memberPassword: karate.properties["memberPassword"] || "Member123!"
  };
}
