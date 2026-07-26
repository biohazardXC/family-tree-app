const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ PEOPLE ROUTES ============

// GET /people - List all people
app.get('/people', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, maiden_name, birth_date, birth_place, death_date, death_place, gender, notes, status, added_by, created_at, updated_at FROM people ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// GET /people/:id - Get a single person
app.get('/people/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, first_name, last_name, maiden_name, birth_date, birth_place, death_date, death_place, gender, notes, status, added_by, created_at, updated_at FROM people WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// POST /people - Create a new person
app.post('/people', async (req, res) => {
  try {
    const { first_name, last_name, maiden_name, birth_date, birth_place, death_date, death_place, gender, notes, status, added_by } = req.body;
    
    // Validate required fields
    if (!first_name) {
      return res.status(400).json({ error: 'first_name is required' });
    }

    const result = await pool.query(
      `INSERT INTO people 
       (first_name, last_name, maiden_name, birth_date, birth_place, death_date, death_place, gender, notes, status, added_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [first_name, last_name, maiden_name, birth_date, birth_place, death_date, death_place, gender, notes, status || 'confirmed', added_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Detailed error:', err);  // <-- Add this line
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// PATCH /people/:id - Update a person
app.patch('/people/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, maiden_name, birth_date, birth_place, death_date, death_place, gender, notes, status, added_by } = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (first_name !== undefined) { fields.push(`first_name = $${paramIndex}`); values.push(first_name); paramIndex++; }
    if (last_name !== undefined) { fields.push(`last_name = $${paramIndex}`); values.push(last_name); paramIndex++; }
    if (maiden_name !== undefined) { fields.push(`maiden_name = $${paramIndex}`); values.push(maiden_name); paramIndex++; }
    if (birth_date !== undefined) { fields.push(`birth_date = $${paramIndex}`); values.push(birth_date); paramIndex++; }
    if (birth_place !== undefined) { fields.push(`birth_place = $${paramIndex}`); values.push(birth_place); paramIndex++; }
    if (death_date !== undefined) { fields.push(`death_date = $${paramIndex}`); values.push(death_date); paramIndex++; }
    if (death_place !== undefined) { fields.push(`death_place = $${paramIndex}`); values.push(death_place); paramIndex++; }
    if (gender !== undefined) { fields.push(`gender = $${paramIndex}`); values.push(gender); paramIndex++; }
    if (notes !== undefined) { fields.push(`notes = $${paramIndex}`); values.push(notes); paramIndex++; }
    if (status !== undefined) { fields.push(`status = $${paramIndex}`); values.push(status); paramIndex++; }
    if (added_by !== undefined) { fields.push(`added_by = $${paramIndex}`); values.push(added_by); paramIndex++; }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE people SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// ============ RELATIONSHIPS ROUTES ============

// GET /relationships - List all relationships
app.get('/relationships', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
        p1.first_name as person_a_first_name, p1.last_name as person_a_last_name,
        p2.first_name as person_b_first_name, p2.last_name as person_b_last_name
       FROM relationships r
       LEFT JOIN people p1 ON r.person_a_id = p1.id
       LEFT JOIN people p2 ON r.person_b_id = p2.id
       ORDER BY r.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// GET /relationships/:id - Get a single relationship
app.get('/relationships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, 
        p1.first_name as person_a_first_name, p1.last_name as person_a_last_name,
        p2.first_name as person_b_first_name, p2.last_name as person_b_last_name
       FROM relationships r
       LEFT JOIN people p1 ON r.person_a_id = p1.id
       LEFT JOIN people p2 ON r.person_b_id = p2.id
       WHERE r.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch relationship' });
  }
});

// POST /relationships - Create a new relationship
app.post('/relationships', async (req, res) => {
  try {
    const { person_a_id, person_b_id, type, subtype, start_date, end_date, status } = req.body;
    
    // Validate required fields
    if (!person_a_id || !person_b_id || !type || !subtype) {
      return res.status(400).json({ error: 'person_a_id, person_b_id, type, and subtype are required' });
    }
    
    if (person_a_id === person_b_id) {
      return res.status(400).json({ error: 'person_a_id and person_b_id must be different' });
    }

    const result = await pool.query(
      `INSERT INTO relationships 
       (person_a_id, person_b_id, type, subtype, start_date, end_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [person_a_id, person_b_id, type, subtype, start_date, end_date, status || 'confirmed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

// PATCH /relationships/:id - Update a relationship
app.patch('/relationships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { person_a_id, person_b_id, type, subtype, start_date, end_date, status } = req.body;
    
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (person_a_id !== undefined) { fields.push(`person_a_id = $${paramIndex}`); values.push(person_a_id); paramIndex++; }
    if (person_b_id !== undefined) { fields.push(`person_b_id = $${paramIndex}`); values.push(person_b_id); paramIndex++; }
    if (type !== undefined) { fields.push(`type = $${paramIndex}`); values.push(type); paramIndex++; }
    if (subtype !== undefined) { fields.push(`subtype = $${paramIndex}`); values.push(subtype); paramIndex++; }
    if (start_date !== undefined) { fields.push(`start_date = $${paramIndex}`); values.push(start_date); paramIndex++; }
    if (end_date !== undefined) { fields.push(`end_date = $${paramIndex}`); values.push(end_date); paramIndex++; }
    if (status !== undefined) { fields.push(`status = $${paramIndex}`); values.push(status); paramIndex++; }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE relationships SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});