CREATE UNIQUE INDEX IF NOT EXISTS uq_organizational_units_name_type_parent
    ON organizational_units_v2 (nome, tipo, parent_id);

ALTER TABLE organizational_units_v2
    ADD CONSTRAINT organizational_units_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX IF NOT EXISTS idx_users_unit_role ON users(organizational_unit_id, role_id);