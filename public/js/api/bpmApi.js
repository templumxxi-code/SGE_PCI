/* API client for the PostgreSQL-backed BPM endpoints. */
(function (window) {
    const source = String(window.BPM_DATA_SOURCE || 'API').toUpperCase();

    const getToken = () => localStorage.getItem('smp_token');
    const request = async (path, options = {}) => {
        const headers = new Headers(options.headers || {});
        const token = getToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
        const response = await fetch(`/api/bpm${path}`, { ...options, headers });
        if (!response.ok) {
            let details = {};
            try { details = await response.json(); } catch (_) { /* Non-JSON error response. */ }
            const error = new Error(details.error || `Erro HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        if (response.status === 204) return null;
        return response.json();
    };

    window.bpmApi = {
        source,
        getProcesses: (filters = {}) => {
            const query = new URLSearchParams(filters).toString();
            return request(`/processes${query ? `?${query}` : ''}`);
        },
        getProcessById: (id) => request(`/processes/${encodeURIComponent(id)}`),
        createProcess: (data) => request('/processes', { method: 'POST', body: JSON.stringify(data) }),
        updateProcess: (id, data) => request(`/processes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
        getPhases: (processId) => request(`/processes/${encodeURIComponent(processId)}/phases`),
        getPhaseById: (id) => request(`/phases/${encodeURIComponent(id)}`),
        getActivities: (phaseId) => request(`/phases/${encodeURIComponent(phaseId)}/activities`),
        getActivityById: (id) => request(`/activities/${encodeURIComponent(id)}`),
        updateActivity: (id, data) => request(`/activities/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
        getChecklist: (activityId) => request(`/activities/${encodeURIComponent(activityId)}/checklist`),
        completeChecklistItem: (id, completed) => request(`/checklist/${encodeURIComponent(id)}/complete`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
        getResponsibles: (activityId) => request(`/activities/${encodeURIComponent(activityId)}/responsibles`),
        addResponsible: (activityId, userId) => request(`/activities/${encodeURIComponent(activityId)}/responsibles`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
        removeResponsible: (activityId, userId) => request(`/activities/${encodeURIComponent(activityId)}/responsibles/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
        uploadAttachment: (activityId, formData) => request(`/activities/${encodeURIComponent(activityId)}/attachments`, { method: 'POST', body: formData }),
        getAttachments: (activityId) => request(`/activities/${encodeURIComponent(activityId)}/attachments`),
        getIndicators: (processId) => request(`/processes/${encodeURIComponent(processId)}/indicators`),
        createIndicator: (processId, data) => request(`/processes/${encodeURIComponent(processId)}/indicators`, { method: 'POST', body: JSON.stringify(data) }),
        updateIndicator: (id, data) => request(`/indicators/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })
        ,getDashboard: (scope = 'unit', filters = {}) => {
            const apiFilters = {
                ...filters,
                unit_type: filters.unit_type || filters.unitType,
                unit_id: filters.unit_id || filters.unitId,
                nucleus_id: filters.nucleus_id || filters.nucleusId,
                sector_id: filters.sector_id || filters.sectorId,
                responsible_user_id: filters.responsible_user_id || filters.responsibleId,
                phase: filters.phase,
                status: filters.status
            };
            const query = new URLSearchParams(Object.entries(apiFilters).filter(([key, value]) => !['unitType', 'unitId', 'nucleusId', 'sectorId', 'responsibleId'].includes(key) && value !== undefined && value !== null && value !== '')).toString();
            return fetch(`/api/dashboard/${scope}${query ? `?${query}` : ''}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(async (response) => {
            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
            return response.json();
            });
        }
        ,getNotifications: () => fetch('/api/notifications', { headers: { Authorization: `Bearer ${getToken()}` } }).then((response) => response.json())
        ,getUnreadNotificationCount: () => fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${getToken()}` } }).then((response) => response.json())
        ,markNotificationRead: (id) => fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` } }).then((response) => response.json())
    };
})(window);
