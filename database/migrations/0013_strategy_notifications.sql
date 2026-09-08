ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

CREATE OR REPLACE FUNCTION notify_process_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    SELECT u.id, 'PROCESS_CREATED', 'Novo processo', 'Um processo foi criado na sua unidade.', NEW.id
    FROM users u
    WHERE u.ativo = TRUE AND u.organizational_unit_id = NEW.organizational_unit_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_created_notification ON processes;
CREATE TRIGGER trg_process_created_notification
AFTER INSERT ON processes
FOR EACH ROW EXECUTE FUNCTION notify_process_created();