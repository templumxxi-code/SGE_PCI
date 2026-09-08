DROP INDEX IF EXISTS uq_organizational_units_name_type_parent;

CREATE UNIQUE INDEX uq_organizational_units_name_type_parent
    ON organizational_units_v2 (nome, tipo, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));