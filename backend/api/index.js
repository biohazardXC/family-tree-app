const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('../db');

const app = express();
const port = process.env.PORT || 5000;

/// Middleware
app.use(cors({
  origin: [
    'https://family-tree-app-frontend.vercel.app',
    'https://family-tree-app-ps9p.vercel.app',
    'http://localhost:5173',
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

// Test database connection route
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ 
      error: err.message,
      stack: err.stack,
      code: err.code
    });
  }
});

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
    console.error('Detailed error:', err);
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

// ============ GAP DETECTION ROUTES ============

// GET /gaps - Detect missing information
app.get('/gaps', async (req, res) => {
  try {
    // Query for missing birth_date
    const missingBirthDate = await pool.query(`
      SELECT 
        p.id as person_id,
        'birth_date' as field_name,
        p.first_name,
        p.last_name,
        p.birth_date
      FROM people p
      LEFT JOIN person_field_status pfs 
        ON p.id = pfs.person_id 
        AND pfs.field_name = 'birth_date'
        AND pfs.status = 'unknown_confirmed'
      WHERE p.birth_date IS NULL
        AND pfs.id IS NULL
    `);

    // Query for missing birth_place
    const missingBirthPlace = await pool.query(`
      SELECT 
        p.id as person_id,
        'birth_place' as field_name,
        p.first_name,
        p.last_name,
        p.birth_place
      FROM people p
      LEFT JOIN person_field_status pfs 
        ON p.id = pfs.person_id 
        AND pfs.field_name = 'birth_place'
        AND pfs.status = 'unknown_confirmed'
      WHERE p.birth_place IS NULL
        AND pfs.id IS NULL
    `);

    // Query for missing death_date - ONLY if death_place is already filled (person is known deceased)
    const missingDeathDate = await pool.query(`
      SELECT 
        p.id as person_id,
        'death_date' as field_name,
        p.first_name,
        p.last_name,
        p.death_date
      FROM people p
      LEFT JOIN person_field_status pfs 
        ON p.id = pfs.person_id 
        AND pfs.field_name = 'death_date'
        AND pfs.status = 'unknown_confirmed'
      WHERE p.death_date IS NULL
        AND p.death_place IS NOT NULL
        AND pfs.id IS NULL
    `);

    // Query for missing death_place - ONLY if death_date is already filled (person is known deceased)
    const missingDeathPlace = await pool.query(`
      SELECT 
        p.id as person_id,
        'death_place' as field_name,
        p.first_name,
        p.last_name,
        p.death_place
      FROM people p
      LEFT JOIN person_field_status pfs 
        ON p.id = pfs.person_id 
        AND pfs.field_name = 'death_place'
        AND pfs.status = 'unknown_confirmed'
      WHERE p.death_place IS NULL
        AND p.death_date IS NOT NULL
        AND pfs.id IS NULL
    `);

    // Combine all gaps
    const gaps = [
      ...missingBirthDate.rows,
      ...missingBirthPlace.rows,
      ...missingDeathDate.rows,
      ...missingDeathPlace.rows
    ];

    // Add full_name for display
    const formattedGaps = gaps.map(gap => ({
      person_id: gap.person_id,
      field_name: gap.field_name,
      full_name: `${gap.first_name || ''} ${gap.last_name || ''}`.trim() || 'Unnamed',
      current_value: gap[gap.field_name] // Shows the current NULL/empty value
    }));

    res.json(formattedGaps);
  } catch (err) {
    console.error('Error detecting gaps:', err);
    res.status(500).json({ error: 'Failed to detect gaps' });
  }
});

// ============ SUBMISSION ROUTES ============

// POST /submissions - Create a new submission
app.post('/submissions', async (req, res) => {
  try {
    const { submitted_by_name, submitted_by_email, scope_person_id, items } = req.body;

    // Validate required fields
    if (!submitted_by_name || !submitted_by_email || !items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'submitted_by_name, submitted_by_email, and items array are required' 
      });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert the submission
      const submissionResult = await client.query(
        `INSERT INTO submissions (submitted_by_name, submitted_by_email, scope_person_id, status, raw_payload)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [submitted_by_name, submitted_by_email, scope_person_id, req.body]
      );

      const submission = submissionResult.rows[0];

      // Insert each submission item
      const insertedItems = [];
      for (const item of items) {
        const { target_type, target_person_id, proposed_data, conflict_flag } = item;
        const itemResult = await client.query(
          `INSERT INTO submission_items 
           (submission_id, target_type, target_person_id, proposed_data, conflict_flag)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [submission.id, target_type, target_person_id, proposed_data, conflict_flag || false]
        );
        insertedItems.push(itemResult.rows[0]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        submission: submission,
        items: insertedItems
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating submission:', err);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// POST /person-field-status - Mark a field as unknown_confirmed or pending
app.post('/person-field-status', async (req, res) => {
  try {
    const { person_id, field_name, status } = req.body;

    // Validate inputs
    if (!person_id || !field_name || !status) {
      return res.status(400).json({ 
        error: 'Missing required fields: person_id, field_name, status' 
      });
    }

    if (!['pending', 'unknown_confirmed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be "pending" or "unknown_confirmed"' 
      });
    }

    // Validate field_name is one we track
    const validFields = ['birth_date', 'birth_place', 'death_date', 'death_place'];
    if (!validFields.includes(field_name)) {
      return res.status(400).json({ 
        error: `field_name must be one of: ${validFields.join(', ')}` 
      });
    }

    // Upsert: insert or update on conflict
    const result = await pool.query(`
      INSERT INTO person_field_status (person_id, field_name, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (person_id, field_name) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `, [person_id, field_name, status]);

    res.json({ 
      success: true, 
      message: `Field '${field_name}' set to '${status}' for person ${person_id}`,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating person field status:', err);
    res.status(500).json({ error: 'Failed to update field status' });
  }
});

// GET /person-field-status/:person_id - Get all field statuses for a person
app.get('/person-field-status/:person_id', async (req, res) => {
  try {
    const { person_id } = req.params;
    const result = await pool.query(
      'SELECT field_name, status, created_at, updated_at FROM person_field_status WHERE person_id = $1',
      [person_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching field statuses:', err);
    res.status(500).json({ error: 'Failed to fetch field statuses' });
  }
});

// ============ SUBMISSION ROUTES ============

// POST /submissions - Create a new submission
app.post('/submissions', async (req, res) => {
  try {
    const { submitted_by_name, submitted_by_email, scope_person_id, items } = req.body;

    // Validate required fields
    if (!submitted_by_name || !submitted_by_email || !items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'submitted_by_name, submitted_by_email, and items array are required' 
      });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert the submission
      const submissionResult = await client.query(
        `INSERT INTO submissions (submitted_by_name, submitted_by_email, scope_person_id, status, raw_payload)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [submitted_by_name, submitted_by_email, scope_person_id, req.body]
      );

      const submission = submissionResult.rows[0];

      // Insert each submission item
      const insertedItems = [];
      for (const item of items) {
        const { target_type, target_person_id, proposed_data, conflict_flag } = item;
        const itemResult = await client.query(
          `INSERT INTO submission_items 
           (submission_id, target_type, target_person_id, proposed_data, conflict_flag)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [submission.id, target_type, target_person_id, proposed_data, conflict_flag || false]
        );
        insertedItems.push(itemResult.rows[0]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        submission: submission,
        items: insertedItems
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating submission:', err);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// GET /submissions/pending - Get all pending submissions for review
app.get('/submissions/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        COUNT(si.id) as item_count,
        json_agg(si.*) as items
      FROM submissions s
      LEFT JOIN submission_items si ON s.id = si.submission_id
      WHERE s.status = 'pending'
      GROUP BY s.id
      ORDER BY s.submitted_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending submissions:', err);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

// GET /submissions/:id - Get a specific submission with its items
app.get('/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get submission
    const submissionResult = await pool.query(
      'SELECT * FROM submissions WHERE id = $1',
      [id]
    );
    
    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Get items
    const itemsResult = await pool.query(
      'SELECT * FROM submission_items WHERE submission_id = $1',
      [id]
    );
    
    res.json({
      ...submissionResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('Error fetching submission:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// PATCH /submission-items/:id - Review a submission item
app.patch('/submission-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body; // 'accepted', 'rejected', 'merged_with_edits'

    if (!['accepted', 'rejected', 'merged_with_edits'].includes(resolution)) {
      return res.status(400).json({ 
        error: 'resolution must be "accepted", "rejected", or "merged_with_edits"' 
      });
    }

    // Update the item
    const itemResult = await pool.query(
      'UPDATE submission_items SET resolution = $1 WHERE id = $2 RETURNING *',
      [resolution, id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission item not found' });
    }

    const item = itemResult.rows[0];

    // If accepted, apply the change to the master tree
    if (resolution === 'accepted' || resolution === 'merged_with_edits') {
      const proposed = item.proposed_data;

      if (item.target_type === 'new_person') {
        // Insert new person
        const personResult = await pool.query(
          `INSERT INTO people (first_name, last_name, maiden_name, birth_date, birth_place, 
            death_date, death_place, gender, notes, status, added_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [proposed.first_name, proposed.last_name, proposed.maiden_name,
           proposed.birth_date, proposed.birth_place, proposed.death_date,
           proposed.death_place, proposed.gender, proposed.notes,
           'confirmed', 'submission']
        );
        // Update target_person_id with the new person's ID
        await pool.query(
          'UPDATE submission_items SET target_person_id = $1 WHERE id = $2',
          [personResult.rows[0].id, id]
        );
        res.json({ message: 'Person created', person: personResult.rows[0] });
      }
      
      else if (item.target_type === 'edit_person') {
        // Update existing person
        const personResult = await pool.query(
          `UPDATE people SET 
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            maiden_name = COALESCE($3, maiden_name),
            birth_date = COALESCE($4, birth_date),
            birth_place = COALESCE($5, birth_place),
            death_date = COALESCE($6, death_date),
            death_place = COALESCE($7, death_place),
            gender = COALESCE($8, gender),
            notes = COALESCE($9, notes),
            updated_at = NOW()
           WHERE id = $10
           RETURNING *`,
          [proposed.first_name, proposed.last_name, proposed.maiden_name,
           proposed.birth_date, proposed.birth_place, proposed.death_date,
           proposed.death_place, proposed.gender, proposed.notes,
           item.target_person_id]
        );
        res.json({ message: 'Person updated', person: personResult.rows[0] });
      }
      
      else if (item.target_type === 'new_relationship') {
        // Create new relationship
        const relResult = await pool.query(
          `INSERT INTO relationships (person_a_id, person_b_id, type, subtype, start_date, end_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
           RETURNING *`,
          [proposed.person_a_id, proposed.person_b_id, proposed.type, 
           proposed.subtype, proposed.start_date, proposed.end_date]
        );
        res.json({ message: 'Relationship created', relationship: relResult.rows[0] });
      }
    } else {
      // Rejected - no changes made
      res.json({ message: 'Item rejected', item: itemResult.rows[0] });
    }
  } catch (err) {
    console.error('Error reviewing submission item:', err);
    res.status(500).json({ error: 'Failed to review submission item' });
  }
});

// PATCH /submissions/:id/status - Update submission status
app.patch('/submissions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'merged', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        error: 'status must be "pending", "merged", or "rejected"' 
      });
    }

    const result = await pool.query(
      'UPDATE submissions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ message: `Submission status updated to ${status}`, submission: result.rows[0] });
  } catch (err) {
    console.error('Error updating submission status:', err);
    res.status(500).json({ error: 'Failed to update submission status' });
  }
});

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Family Tree API is running!',
    endpoints: [
      '/people',
      '/gaps',
      '/relationships',
      '/test-db',
      '/db-test',
      '/person-field-status',
      '/submissions',
      '//submissions/pending',
      '/submission-items' 
    ]
  });
});

// Start server (only when running locally)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export for Vercel serverless
module.exports = app;