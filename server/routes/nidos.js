const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// ─── Query base reutilizable ───────────────────────────────────────────────
const SELECT_NIDOS = `
  SELECT
    n.id,
    n."codigoNido",
    CONCAT(t.codigo, '-#', LPAD(n."codigoNido"::TEXT, 4, '0')) AS "claveNido",
    n."temporadaId",
    t.codigo AS "codigoTemporada",
    n."especieId",
    e.nombre AS "nombreEspecie",
    n."tipoNido",
    n.estado,
    n."fechaRecoleccion",
    n."fechaEclosion",
    n."totalHuevos",
    n."eclosionesExitosas",
    n."eclosionesNoExitosas",
    n."adoptanteNombre",
    n."adoptanteTelefono",
    n.observaciones,
    n."createdAt",
    n."updatedAt"
  FROM nidos n
  JOIN temporadas t ON t."temporadaId"= n."temporadaId"
  JOIN especies e   ON e.id = n."especieId"
`;

// ─── GET /api/nidos?temporadaId=xxx ───────────────────────────────────────
// Lista todos los nidos de una temporada, ordenados por codigoNido
router.get('/', async (req, res) => {
    const { temporadaId } = req.query;

    try {
        let query = SELECT_NIDOS;
        const params = [];

        if (temporadaId) {
            query += ` WHERE n."temporadaId" = $1`;
            params.push(temporadaId);
        }

        query += ` ORDER BY n."codigoNido" ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener nidos' });
    }
});

// ─── GET /api/nidos/temporadas ─────────────────────────────────────────────
// Lista todas las temporadas (para el toggle selector)
router.get('/temporadas', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT "temporadaId", codigo, "anioinicio", "aniofin", estado
      FROM temporadas
      ORDER BY "anioinicio" DESC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener temporadas' });
    }
});

// ─── GET /api/nidos/especies ───────────────────────────────────────────────
router.get('/especies', async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, nombre FROM especies ORDER BY nombre`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener especies' });
    }
});

// ─── GET /api/nidos/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            SELECT_NIDOS + ` WHERE n.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Nido no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener nido' });
    }
});

// ─── POST /api/nidos ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const {
        codigoNido, temporadaId, especieId, tipoNido,
        fechaRecoleccion,
        totalHuevos,
        // Eclosión (opcionales)
        fechaEclosion, eclosionesExitosas,
        // Adopción (opcionales)
        adoptanteNombre, adoptanteTelefono,
        observaciones,
    } = req.body;

    // Validación básica
    if (!codigoNido || !temporadaId || !especieId || !tipoNido || !fechaRecoleccion) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (totalHuevos === undefined || totalHuevos === null) {
        return res.status(400).json({ error: 'El total de huevos es obligatorio' });
    }

    // Verificar duplicado en la misma temporada
    const existe = await pool.query(
        `SELECT 1 FROM nidos WHERE "temporadaId" = $1 AND "codigoNido" = $2`,
        [temporadaId, codigoNido]
    );
    if (existe.rows.length > 0) {
        return res.status(409).json({
            error: `El nido #${codigoNido} ya existe en esta temporada`,
        });
    }

    // Determinar estado y calcular no exitosas
    const eclosionado = !!fechaEclosion;
    const estado = eclosionado ? 'ECLOSIONADO' : 'ACTIVO';
    const eclosionesNoExitosas = eclosionado
        ? Number(totalHuevos) - Number(eclosionesExitosas)
        : null;

    try {
        const result = await pool.query(
            `INSERT INTO nidos (
        "codigoNido", "temporadaId", "especieId", "tipoNido", estado,
        "fechaRecoleccion",
        "fechaEclosion", "totalHuevos", "eclosionesExitosas", "eclosionesNoExitosas",
        "adoptanteNombre", "adoptanteTelefono", observaciones
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      ) RETURNING id`,
            [
                codigoNido, temporadaId, especieId, tipoNido, estado,
                fechaRecoleccion || null,
                fechaEclosion || null,
                Number(totalHuevos),
                eclosionado ? Number(eclosionesExitosas) : null,
                eclosionesNoExitosas,
                adoptanteNombre || null,
                adoptanteTelefono || null,
                observaciones || null,
            ]
        );
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        // Captura el unique constraint de BD como segunda línea de defensa
        if (err.code === '23505') {
            return res.status(409).json({ error: `El nido #${codigoNido} ya existe en esta temporada` });
        }
        res.status(500).json({ error: 'Error al registrar nido' });
    }
});

// ─── PUT /api/nidos/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const {
        especieId, tipoNido, fechaRecoleccion,
        totalHuevos,
        fechaEclosion, eclosionesExitosas,
        adoptanteNombre, adoptanteTelefono, observaciones,
    } = req.body;

    const eclosionado = !!fechaEclosion;
    const estado = eclosionado ? 'ECLOSIONADO' : 'ACTIVO';
    const eclosionesNoExitosas = eclosionado
        ? Number(totalHuevos) - Number(eclosionesExitosas)
        : null;

    try {
        const result = await pool.query(
            `UPDATE nidos SET
        "especieId"              = $1,
        "tipoNido"               = $2,
        estado                   = $3,
        "fechaRecoleccion"       = $4,
        "fechaEclosion"          = $5,
        "totalHuevos"            = $6,
        "eclosionesExitosas"     = $7,
        "eclosionesNoExitosas"   = $8,
        "adoptanteNombre"        = $9,
        "adoptanteTelefono"      = $10,
        observaciones            = $11
      WHERE id = $12
      RETURNING id`,
            [
                especieId, tipoNido, estado,
                fechaRecoleccion || null,
                fechaEclosion || null,
                Number(totalHuevos),
                eclosionado ? Number(eclosionesExitosas) : null,
                eclosionesNoExitosas,
                adoptanteNombre || null,
                adoptanteTelefono || null,
                observaciones || null,
                req.params.id,
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Nido no encontrado' });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar nido' });
    }
});

module.exports = router;