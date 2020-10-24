module.exports = {
  "development": {
    "use_env_variable": "DEV_DATABASE_URL",
    "protocol": "postgres",
    "dialect": "postgres"
  },
  "test": {
    "use_env_variable": "TEST_DATABASE_URL",
    "protocol": "postgres",
    "dialect": "postgres"
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "protocol": "postgres",
    "dialect": "postgres"
  }
}
