import { useState, useEffect, useCallback } from 'react';
import { getTemporadas, getEspecies, getNidosByTemporada, createNido, updateNido } from './api/nidos';
import './App.css';
import logo from './assets/icon_camp_vector.svg'

// ─── Formulario de nido ────────────────────────────────────────────────────
function NidoForm({ temporadas, especies, temporadaActiva, nidoEditar, onSuccess, onCancel }) {
    const esEdicion = !!nidoEditar;

    const [form, setForm] = useState({
        codigoNido: '',
        temporadaId: temporadaActiva?.temporadaId || '',
        especieId: '',
        tipoNido: 'IN_SITU',
        fechaRecoleccion: '',
        totalHuevos: '',
        observaciones: '',
        // Eclosión
        eclosionado: false,
        fechaEclosion: '',
        eclosionesExitosas: '',
        // Adopción
        adoptado: false,
        adoptanteNombre: '',
        adoptanteTelefono: '',
    });


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Cargar datos al editar
    useEffect(() => {
        if (nidoEditar) {
            setForm({
                codigoNido: nidoEditar.codigoNido,
                temporadaId: nidoEditar.temporadaId,
                especieId: nidoEditar.especieId,
                tipoNido: nidoEditar.tipoNido,
                fechaRecoleccion: nidoEditar.fechaRecoleccion?.split('T')[0] || '',
                totalHuevos: nidoEditar.totalHuevos ?? '',
                observaciones: nidoEditar.observaciones || '',
                eclosionado: nidoEditar.estado === 'ECLOSIONADO',
                fechaEclosion: nidoEditar.fechaEclosion?.split('T')[0] || '',
                eclosionesExitosas: nidoEditar.eclosionesExitosas ?? '',
                adoptado: !!nidoEditar.adoptanteNombre,
                adoptanteNombre: nidoEditar.adoptanteNombre || '',
                adoptanteTelefono: nidoEditar.adoptanteTelefono || '',
            });
        }
    }, [nidoEditar]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validación cliente
        if (!form.codigoNido || form.codigoNido < 1 || form.codigoNido >= 10000)
            return setError('El número de nido debe estar entre 1 y 9999');
        if (!form.temporadaId) return setError('Selecciona una temporada');
        if (!form.especieId) return setError('Selecciona una especie');
        if (!form.fechaRecoleccion) return setError('La fecha de recolección es obligatoria');
        if (form.totalHuevos === '') return setError('El total de huevos es obligatorio');
        if (Number(form.totalHuevos) < 0) return setError('El total de huevos no puede ser negativo');
        if (form.eclosionado) {
            if (!form.fechaEclosion) return setError('Ingresa la fecha de eclosión');
            if (form.fechaEclosion < form.fechaRecoleccion) return setError('La fecha de eclosión no puede ser anterior a la fecha de recolección');
            if (form.eclosionesExitosas === '') return setError('Ingresa las eclosiones exitosas');
            if (Number(form.eclosionesExitosas) > Number(form.totalHuevos))
                return setError('Las eclosiones exitosas no pueden superar el total de huevos');
        }
        if (form.adoptado && !form.adoptanteNombre.trim())
            return setError('Ingresa el nombre del adoptante');

        const totalHuevos = Number(form.totalHuevos);
        const eclosionesExitosas = form.eclosionado ? Number(form.eclosionesExitosas) : null;
        const eclosionesNoExitosas = form.eclosionado ? totalHuevos - eclosionesExitosas : null;

        const payload = {
            codigoNido: Number(form.codigoNido),
            temporadaId: form.temporadaId,
            especieId: form.especieId,
            tipoNido: form.tipoNido,
            fechaRecoleccion: form.fechaRecoleccion,

            totalHuevos,
            observaciones: form.observaciones || null,
            fechaEclosion: form.eclosionado ? form.fechaEclosion : null,
            eclosionesExitosas,
            eclosionesNoExitosas,
            adoptanteNombre: form.adoptado ? form.adoptanteNombre.trim() : null,
            adoptanteTelefono: form.adoptado ? form.adoptanteTelefono.trim() || null : null,
        };

        setLoading(true);
        try {
            if (esEdicion) {
                await updateNido(nidoEditar.id, payload);
            } else {
                await createNido(payload);
            }
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-overlay">
            <div className="form-card">
                <div className="form-header">
                    <h2>{esEdicion ? `Editar Nido #${nidoEditar.codigoNido}` : 'Registrar Nido'}</h2>
                    <button className="btn-close" onClick={onCancel}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* ── Datos base ── */}
                    <div className="form-section">
                        <h3 className="section-label">Datos del nido</h3>
                        <div className="form-grid">

                            <div className="field">
                                <label>Número de nido *</label>
                                <input
                                    type="number" min="1" max="9999"
                                    value={form.codigoNido}
                                    onChange={e => set('codigoNido', e.target.value)}
                                    disabled={esEdicion}
                                    placeholder="Ej: 303"
                                />
                            </div>

                            <div className="field">
                                <label>Temporada *</label>
                                <select
                                    value={form.temporadaId}
                                    onChange={e => set('temporadaId', e.target.value)}
                                    disabled={esEdicion}
                                >
                                    <option value="">Seleccionar...</option>
                                    {temporadas.map(t => (
                                        <option key={t.temporadaId} value={t.temporadaId}>
                                            {t.codigo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label>Especie *</label>
                                <select value={form.especieId} onChange={e => set('especieId', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {especies.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label>Tipo de nido *</label>
                                <div className="toggle-group">
                                    {['IN_SITU', 'CORRAL'].map(tipo => (
                                        <button
                                            key={tipo}
                                            type="button"
                                            className={`toggle-btn ${form.tipoNido === tipo ? 'active' : ''}`}
                                            onClick={() => set('tipoNido', tipo)}
                                        >
                                            {tipo === 'IN_SITU' ? 'In Situ' : 'Corral'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="field">
                                <label>Fecha de recolección *</label>
                                <input type="date" value={form.fechaRecoleccion}
                                    onChange={e => set('fechaRecoleccion', e.target.value)} />
                            </div>

                            <div className="field">
                                <label>Total de huevos *</label>
                                <input type="number" min="0" value={form.totalHuevos}
                                    onChange={e => set('totalHuevos', e.target.value)}
                                    placeholder="Ej: 110" />
                            </div>

                            <div className="field full">
                                <label>Observaciones</label>
                                <textarea value={form.observaciones}
                                    onChange={e => set('observaciones', e.target.value)}
                                    rows={2} placeholder="Notas adicionales..." />
                            </div>
                        </div>
                    </div>

                    {/* ── Check eclosión ── */}
                    <div className="form-section">
                        <label className="check-label">
                            <input type="checkbox" checked={form.eclosionado}
                                onChange={e => set('eclosionado', e.target.checked)} />
                            <span>¿El nido ya eclosionó?</span>
                        </label>

                        {form.eclosionado && (
                            <div className="form-grid revealed">
                                <div className="field">
                                    <label>Fecha de eclosión *</label>
                                    <input type="date" value={form.fechaEclosion}
                                        onChange={e => set('fechaEclosion', e.target.value)} />
                                </div>
                                <div className="field">
                                    <label>Eclosiones exitosas *</label>
                                    <input type="number" min="0" max={form.totalHuevos || undefined}
                                        value={form.eclosionesExitosas}
                                        onChange={e => set('eclosionesExitosas', e.target.value)} />
                                </div>
                                <div className="field">
                                    <label>Eclosiones no exitosas</label>
                                    <div className="derived-value">
                                        {form.totalHuevos !== '' && form.eclosionesExitosas !== ''
                                            ? Number(form.totalHuevos) - Number(form.eclosionesExitosas)
                                            : '—'}
                                        <span className="derived-hint">calculado automáticamente</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Check adopción ── */}
                    <div className="form-section">
                        <label className="check-label">
                            <input type="checkbox" checked={form.adoptado}
                                onChange={e => set('adoptado', e.target.checked)} />
                            <span>¿El nido fue adoptado?</span>
                        </label>

                        {form.adoptado && (
                            <div className="form-grid revealed">
                                <div className="field">
                                    <label>Nombre del adoptante *</label>
                                    <input type="text" value={form.adoptanteNombre}
                                        onChange={e => set('adoptanteNombre', e.target.value)}
                                        placeholder="Nombre completo" />
                                </div>
                                <div className="field">
                                    <label>Teléfono del adoptante</label>
                                    <input type="tel" value={form.adoptanteTelefono}
                                        onChange={e => set('adoptanteTelefono', e.target.value)}
                                        placeholder="Opcional" />
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onCancel}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Registrar nido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Tabla de nidos ────────────────────────────────────────────────────────
function NidoTable({ nidos, onEditar }) {
    if (nidos.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">🐢</span>
                <p>No hay nidos registrados en esta temporada</p>
            </div>
        );
    }

    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Especie</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Recolección</th>
                        <th>Eclosión</th>
                        <th>Huevos</th>
                        <th>Exitosas</th>
                        <th>Adoptante</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {nidos.map(n => (
                        <tr key={n.id}>
                            <td className="codigo-cell">
                                <span className="badge-codigo">{String(n.codigoNido).padStart(4, '0')}</span>
                            </td>
                            <td>{n.nombreEspecie}</td>
                            <td>
                                <span className={`badge-tipo ${n.tipoNido.toLowerCase()}`}>
                                    {n.tipoNido === 'IN_SITU' ? 'In Situ' : 'Corral'}
                                </span>
                            </td>
                            <td>
                                <span className={`badge-estado ${n.estado.toLowerCase()}`}>
                                    {n.estado === 'ACTIVO' ? 'Activo' : 'Eclosionado'}
                                </span>
                            </td>
                            <td>{n.fechaRecoleccion?.split('T')[0] || '—'}</td>
                            <td>{n.fechaEclosion?.split('T')[0] || '—'}</td>
                            <td>{n.totalHuevos ?? '—'}</td>
                            <td>{n.eclosionesExitosas ?? '—'}</td>
                            <td>{n.adoptanteNombre || '—'}</td>
                            <td>
                                <button className="btn-edit" onClick={() => onEditar(n)}>Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── App principal ─────────────────────────────────────────────────────────
export default function App() {
    const [temporadas, setTemporadas] = useState([]);
    const [especies, setEspecies] = useState([]);
    const [temporadaSeleccionada, setTemporadaSeleccionada] = useState(null);
    const [nidos, setNidos] = useState([]);
    const [filtros, setFiltros] = useState({
        busqueda: '',
        especie: '',
        estado: '',
        tipoNido: '',
        adoptado: '',
    });
    const [loadingNidos, setLoadingNidos] = useState(false);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [nidoEditar, setNidoEditar] = useState(null);

    // Cargar temporadas y especies al inicio
    useEffect(() => {
        Promise.all([getTemporadas(), getEspecies()])
            .then(([ts, es]) => {
                setTemporadas(ts);
                setEspecies(es);
                // Seleccionar ACTIVA por defecto
                const activa = ts.find(t => t.estado === 'ACTIVA') || ts[0];
                if (activa) setTemporadaSeleccionada(activa);
            })
            .catch(console.error);
    }, []);

    // Cargar nidos al cambiar temporada
    const cargarNidos = useCallback(async () => {
        if (!temporadaSeleccionada) return;
        setLoadingNidos(true);
        try {
            const data = await getNidosByTemporada(temporadaSeleccionada.temporadaId);
            setNidos(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingNidos(false);
        }
    }, [temporadaSeleccionada]);

    useEffect(() => {
        setFiltros({ busqueda: '', especie: '', estado: '', tipoNido: '', adoptado: '' });
        cargarNidos();
    }, [cargarNidos]);
    const handleSuccess = () => {
        setMostrarForm(false);
        setNidoEditar(null);
        cargarNidos();
    };

    const handleEditar = (nido) => {
        setNidoEditar(nido);
        setMostrarForm(true);
    };

    const eclosionados = nidos.filter(n => n.estado === 'ECLOSIONADO').length;
    const adoptados = nidos.filter(n => n.adoptanteNombre).length;

    const nidosFiltrados = nidos.filter(n => {
        if (filtros.busqueda && !String(n.codigoNido).includes(filtros.busqueda))
            return false;
        if (filtros.especie && n.especieId !== filtros.especie)
            return false;
        if (filtros.estado && n.estado !== filtros.estado)
            return false;
        if (filtros.tipoNido && n.tipoNido !== filtros.tipoNido)
            return false;
        if (filtros.adoptado === 'si' && !n.adoptanteNombre)
            return false;
        if (filtros.adoptado === 'no' && n.adoptanteNombre)
            return false;
        return true;
    });


    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-brand">
                    <img src={logo} alt="Logo" className="header-logo" />
                    <div>
                        <h1>Campamento Tortuguero</h1>
                        <p>Registro de Nidos</p>
                    </div>
                </div>
            </header>

            <main className="app-main">
                {/* Toggle de temporadas */}
                <section className="temporadas-section">
                    <h2 className="section-title">Temporada</h2>
                    <div className="temporadas-scroll">
                        {temporadas.map(t => (
                            <button
                                key={t.temporadaId}
                                className={`temporada-btn ${temporadaSeleccionada?.temporadaId === t.temporadaId ? 'active' : ''} ${t.estado === 'ACTIVA' ? 'activa' : ''}`}
                                onClick={() => setTemporadaSeleccionada(t)}
                            >
                                {t.codigo}
                                {t.estado === 'ACTIVA' && <span className="dot-activa" />}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Stats de la temporada */}
                {temporadaSeleccionada && (
                    <section className="stats-row">
                        <div className="stat-card">
                            <span className="stat-num">{nidos.length}</span>
                            <span className="stat-label">Nidos registrados</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{eclosionados}</span>
                            <span className="stat-label">Eclosionados</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{nidos.length - eclosionados}</span>
                            <span className="stat-label">Activos</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-num">{adoptados}</span>
                            <span className="stat-label">Adoptados</span>
                        </div>
                    </section>
                )}

                {/* Acciones */}
                <section className="actions-row">
                    <h2 className="section-title">
                        Nidos — {temporadaSeleccionada?.codigo || '...'}
                    </h2>
                    <button
                        className="btn-primary"
                        onClick={() => { setNidoEditar(null); setMostrarForm(true); }}
                    >
                        + Registrar nido
                    </button>
                </section>


                {/* Filtros */}
                <div className="filtros-row">
                    <input
                        type="number"
                        placeholder="Buscar # nido..."
                        className="filtro-input"
                        value={filtros.busqueda}
                        onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                    />
                    <select
                        className="filtro-select"
                        value={filtros.especie}
                        onChange={e => setFiltros(f => ({ ...f, especie: e.target.value }))}
                    >
                        <option value="">Todas las especies</option>
                        {especies.map(e => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                    </select>
                    <select
                        className="filtro-select"
                        value={filtros.estado}
                        onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
                    >
                        <option value="">Todos los estados</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="ECLOSIONADO">Eclosionado</option>
                    </select>
                    <select
                        className="filtro-select"
                        value={filtros.tipoNido}
                        onChange={e => setFiltros(f => ({ ...f, tipoNido: e.target.value }))}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="IN_SITU">In Situ</option>
                        <option value="CORRAL">Corral</option>
                    </select>
                    <select
                        className="filtro-select"
                        value={filtros.adoptado}
                        onChange={e => setFiltros(f => ({ ...f, adoptado: e.target.value }))}
                    >
                        <option value="">Adopción: todos</option>
                        <option value="si">Adoptados</option>
                        <option value="no">No adoptados</option>
                    </select>
                    {Object.values(filtros).some(v => v !== '') && (
                        <button
                            className="btn-secondary"
                            onClick={() => setFiltros({ busqueda: '', especie: '', estado: '', tipoNido: '', adoptado: '' })}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
                {/* Tabla */}
                {loadingNidos ? (
                    <div className="loading">Cargando nidos...</div>
                ) : (
                    <NidoTable nidos={nidosFiltrados} onEditar={handleEditar} />
                )}
            </main>

            {/* Modal formulario */}
            {mostrarForm && (
                <NidoForm
                    temporadas={temporadas}
                    especies={especies}
                    temporadaActiva={temporadaSeleccionada}
                    nidoEditar={nidoEditar}
                    onSuccess={handleSuccess}
                    onCancel={() => { setMostrarForm(false); setNidoEditar(null); }}
                />
            )}
        </div>
    );
}
