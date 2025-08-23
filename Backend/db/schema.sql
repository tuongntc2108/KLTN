-- =========================
-- Tables for MySBT backend
-- =========================

-- 1) Chứng chỉ (mirror từ on-chain)
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL UNIQUE,
    metadata_uri TEXT NOT NULL,
    holder VARCHAR(42) NOT NULL,
    issuer VARCHAR(42) NOT NULL,
    issued_date TIMESTAMP NOT NULL,
    expire_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,               -- Issued | Active | Expired | Revoked | Replaced
    course_id VARCHAR(100),
    student_id VARCHAR(100),
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    certificate_type VARCHAR(50),
    recipient_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_holder  ON certificates(holder);
CREATE INDEX IF NOT EXISTS idx_cert_issuer  ON certificates(issuer);
CREATE INDEX IF NOT EXISTS idx_cert_status  ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_cert_vcode   ON certificates(verification_code);

-- 2) Log các event từ blockchain (audit)
CREATE TABLE IF NOT EXISTS certificate_events (
    id SERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,           -- Issued | Claimed | Revoked | Expired | Replaced
    issuer VARCHAR(42),
    holder VARCHAR(42),
    reason TEXT,
    related_token BIGINT,                      -- token mới nếu Replaced
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ce_token ON certificate_events(token_id);
CREATE INDEX IF NOT EXISTS idx_ce_type  ON certificate_events(event_type);

-- 3) Con trỏ đồng bộ block (để resume an toàn)
CREATE TABLE IF NOT EXISTS sync_cursors (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(50) UNIQUE NOT NULL,
    last_block BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);
