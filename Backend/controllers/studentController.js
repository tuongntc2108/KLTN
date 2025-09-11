const db = require("../config/pg");

exports.createStudent = async (req, res) => {
  try {
    const { student_id, id: aliasId, name, email, wallet_address } = req.body;

    // Validation
    const candidateId = student_id ?? aliasId;
    if (!candidateId || !name || !email || !wallet_address) {
      return res.status(400).json({ error: "Validation error", details: "student_id (or id), name, email, wallet_address are required" });
    }
    const idNum = Number(candidateId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "Validation error", details: "student_id must be a positive integer" });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({ error: "Validation error", details: "wallet_address is invalid" });
    }

    // Insert
    const q = `
      INSERT INTO students(id, name, email, wallet_address)
      VALUES($1,$2,$3,$4)
      RETURNING id, name, email, wallet_address, created_at
    `;
    const params = [idNum, name, email.toLowerCase(), wallet_address];
    const r = await db.query(q, params);
    const s = r.rows[0];

    return res.status(201).json({
      student_id: s.id,
      name: s.name,
      email: s.email,
      wallet_address: s.wallet_address,
      created_at: s.created_at,
    });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: "Validation error", details: "email or wallet_address already exists" });
    }
    console.error("❌ createStudent error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const q = `
      SELECT s.id, s.name, s.email, s.wallet_address
      FROM students s
      ORDER BY s.id ASC
    `;
    const r = await db.query(q);
    const result = r.rows.map(row => ({
      student_id: row.id,
      name: row.name,
      email: row.email,
      wallet_address: row.wallet_address,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ getStudents error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const idParam = Number(req.params.id);
    if (!Number.isInteger(idParam) || idParam <= 0) {
      return res.status(400).json({ error: "Bad Request", details: "Invalid id in URL" });
    }

    const { name, email, wallet_address } = req.body || {};
    if (!name || !email || !wallet_address) {
      return res.status(400).json({ error: "Bad Request", details: "name, email, wallet_address are required" });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({ error: "Bad Request", details: "wallet_address is invalid" });
    }

    const q = `
      UPDATE students
      SET name=$1, email=$2, wallet_address=$3
      WHERE id=$4
      RETURNING id
    `;
    const params = [name, String(email).toLowerCase(), wallet_address, idParam];
    const r = await db.query(q, params);
    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Not Found" });
    }

    return res.status(200).json({ message: "Student updated successfully" });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Bad Request", details: "email or wallet_address already exists" });
    }
    console.error("❌ updateStudent error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
