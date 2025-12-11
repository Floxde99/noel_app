const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: 'localhost',
  port: 3306,
  user: 'noel',
  password: 'noel_password',
  database: 'noel_db',
  connectionLimit: 5,
  connectTimeout: 10000,
  acquireTimeout: 10000
});

async function test() {
  let conn;
  try {
    console.log('Connecting to MariaDB...');
    conn = await pool.getConnection();
    console.log('Connected! Running query...');
    const rows = await conn.query('SELECT 1 as val');
    console.log('Result:', rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

test();
