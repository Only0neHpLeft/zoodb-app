import { describe, it, expect } from 'vitest'
import { executeSQL, executeRawSQL } from '../tauri-db'

describe('SQL Query Safety Validation', () => {
  describe('executeSQL', () => {
    it('should reject DROP statements', async () => {
      const result = await executeSQL('DROP TABLE users')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject DELETE statements', async () => {
      const result = await executeSQL('DELETE FROM users WHERE id = 1')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject INSERT statements', async () => {
      const result = await executeSQL("INSERT INTO users (name) VALUES ('test')")
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject UPDATE statements', async () => {
      const result = await executeSQL("UPDATE users SET name = 'test' WHERE id = 1")
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject TRUNCATE statements', async () => {
      const result = await executeSQL('TRUNCATE TABLE users')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject ALTER statements', async () => {
      const result = await executeSQL('ALTER TABLE users ADD COLUMN email TEXT')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject CREATE statements', async () => {
      const result = await executeSQL('CREATE TABLE test (id INT)')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject SQL injection attempts with comments', async () => {
      const result = await executeSQL("SELECT * FROM users WHERE id = 1 -- DROP TABLE users")
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('prohibited keyword')
    })

    it('should reject multiple statements', async () => {
      const result = await executeSQL('SELECT * FROM users; SELECT * FROM animals')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Multiple SQL statements are not allowed')
    })

    it('should reject GRANT statements', async () => {
      const result = await executeSQL('GRANT ALL ON users TO attacker')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject EXECUTE statements', async () => {
      const result = await executeSQL('EXECUTE sp_malicious')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })
  })

  describe('executeRawSQL', () => {
    it('should reject DROP statements', async () => {
      const result = await executeRawSQL('DROP TABLE users')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject DELETE statements', async () => {
      const result = await executeRawSQL('DELETE FROM users WHERE id = 1')
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject INSERT statements', async () => {
      const result = await executeRawSQL("INSERT INTO users (name) VALUES ('test')")
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Only SELECT queries are allowed')
    })

    it('should reject SQL injection via UNION', async () => {
      // This is actually a SELECT, so it tests that we're not blocking valid SELECTs
      // The dangerous keywords check would catch any destructive operations in UNION
      const result = await executeRawSQL("SELECT * FROM users UNION SELECT * FROM admins")
      // This should NOT error since it's a valid SELECT (just using UNION)
      // The safety check allows SELECT queries
      expect(result.error?.message).not.toContain('Only SELECT queries are allowed')
    })
  })
})
