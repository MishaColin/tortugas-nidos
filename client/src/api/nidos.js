const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function getTemporadas() {
    const r = await fetch(`${BASE}/api/nidos/temporadas`);
    if (!r.ok) throw new Error('Error al cargar temporadas');
    return r.json();
}

export async function getEspecies() {
    const r = await fetch(`${BASE}/api/nidos/especies`);
    if (!r.ok) throw new Error('Error al cargar especies');
    return r.json();
}

export async function getNidosByTemporada(temporadaId) {
    const r = await fetch(`${BASE}/api/nidos?temporadaId=${temporadaId}`);
    if (!r.ok) throw new Error('Error al cargar nidos');
    return r.json();
}

export async function getNido(id) {
    const r = await fetch(`${BASE}/api/nidos/${id}`);
    if (!r.ok) throw new Error('Error al cargar nido');
    return r.json();
}

export async function createNido(data) {
    const r = await fetch(`${BASE}/api/nidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Error al registrar nido');
    return json;
}

export async function updateNido(id, data) {
    const r = await fetch(`${BASE}/api/nidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Error al actualizar nido');
    return json;
}