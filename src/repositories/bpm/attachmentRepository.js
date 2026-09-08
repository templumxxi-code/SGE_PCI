const { query } = require('../../models/db');

const saveAttachment = async (data) => {
    const result = await query(
        `INSERT INTO attachments (process_id, activity_id, file_name, storage_path, attachment_type, required, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [data.processId, data.activityId || null, data.fileName, data.storagePath, data.attachmentType, Boolean(data.required), data.uploadedBy]
    );
    return result.rows[0];
};

const getAttachments = async (processId, activityId = null) => {
    const params = [processId];
    let sql = 'SELECT * FROM attachments WHERE process_id = $1';
    if (activityId) { params.push(activityId); sql += ' AND activity_id = $2'; }
    sql += ' ORDER BY created_at DESC';
    return (await query(sql, params)).rows;
};

module.exports = { saveAttachment, getAttachments };