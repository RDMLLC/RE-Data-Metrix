import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;
const SALT_ROUNDS = 10;

async function hashLenderPasswords() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    const result = await client.query('SELECT id, email, password FROM lenders');
    console.log(`Found ${result.rows.length} lenders`);
    
    for (const lender of result.rows) {
      if (lender.password.startsWith('$2')) {
        console.log(`Skipping ${lender.email} - already hashed`);
        continue;
      }
      
      console.log(`Hashing password for ${lender.email}...`);
      const hashed = await bcrypt.hash(lender.password, SALT_ROUNDS);
      
      await client.query('UPDATE lenders SET password = $1 WHERE id = $2', [hashed, lender.id]);
      console.log(`✓ Updated ${lender.email}`);
    }
    
    console.log('\n✓ All passwords hashed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

hashLenderPasswords();
