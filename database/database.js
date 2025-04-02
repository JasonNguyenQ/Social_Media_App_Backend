const mysql = require('mysql2/promise');
const redis = require('redis')

const DBConnection = mysql.createPool({
    connectionLimit : 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
});

const redisConnection = redis.createClient(process.env.REDIS_PORT || 6379)
redisConnection.connect()

module.exports = {redisConnection, DBConnection}