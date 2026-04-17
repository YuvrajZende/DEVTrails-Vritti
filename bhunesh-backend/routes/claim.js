import axios from 'axios';

// ─── Revenue Loss Calculation Constants ───
const WORKING_HOURS_PER_WEEK = 48; // 6 days × 8 hours

const SEVERITY_CONFIG = {
    LOW:    { hours: 2,  multiplier: 0.50 },
    MEDIUM: { hours: 6,  multiplier: 0.75 },
    HIGH:   { hours: 12, multiplier: 1.00 },
};

const DEFAULT_FRAUD = {
    fraud_score: 0.15,
    recommendation: 'AUTO_APPROVE',
    payout_amount: 0,
    flags: [],
    layers_triggered: ['LAYER_1_PASS']
};

function generateClaimId() {
    return `clm_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function generateEventId() {
    return `evt_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function resolveServiceUrl(rawUrl, endpointPath) {
    if (!rawUrl || rawUrl === 'mock') return null;
    const trimmed = rawUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.endsWith(endpointPath) ? trimmed : `${trimmed}${endpointPath}`;
}

function mapClaimStatus(recommendation) {
    const normalized = String(recommendation || '').toUpperCase();
    if (normalized === 'AUTO_APPROVE') return 'APPROVED';
    if (normalized === 'HOLD') return 'HOLD';
    if (normalized === 'PARTIAL_PAYOUT' || normalized === 'PARTIAL') return 'PARTIAL';
    return 'PENDING';
}

// ─── ML Risk Score Integration (LAYER 1) ───
// Calls the XGBoost risk-score service to get real-time fraud assessment
async function fetchRiskScore(fastify, worker) {
    const riskUrl = resolveServiceUrl(process.env.RISK_SCORE_URL, '/risk-score');
    if (!riskUrl) {
        fastify.log.info('RISK_SCORE_URL not set, using worker stored risk score');
        return {
            risk_score: worker.latest_risk_score ?? 0.15,
            source: 'stored'
        };
    }

    try {
        const response = await axios.post(riskUrl, {
            tenure_weeks: worker.tenure_weeks ?? 0,
            daily_active_hours: worker.daily_active_hours ?? 8.0,
            weekly_delivery_days: worker.weekly_delivery_days ?? 6,
            avg_weekly_earnings: worker.avg_weekly_earnings ?? 3000,
            earnings_std_dev: worker.earnings_std_dev ?? 500,
            claim_count_90d: worker.claim_count_90d ?? 0,
            zone_disruption_days: worker.zone_disruption_days ?? 15,
            zone_aqi_baseline: worker.zone_aqi_baseline ?? 100,
            is_monsoon_season: worker.is_monsoon_season ?? 0,
            is_flood_prone_zone: worker.is_flood_prone_zone ?? 0,
            is_part_time: worker.is_part_time ?? 0
        }, { timeout: 5000 });

        return {
            risk_score: response.data.risk_score ?? 0.15,
            premium_tier: response.data.premium_tier,
            coverage_cap: response.data.coverage_cap,
            source: 'ml_model'
        };
    } catch (err) {
        fastify.log.warn(`ML Risk Score API failed, using fallback: ${err.message}`);
        return {
            risk_score: worker.latest_risk_score ?? 0.15,
            source: 'fallback'
        };
    }
}

async function validateFraudWithService(fastify, payload) {
    const fraudUrl = resolveServiceUrl(process.env.FRAUD_VALIDATE_URL, '/fraud-validate');
    if (!fraudUrl) {
        return null;
    }

    try {
        const response = await axios.post(fraudUrl, payload, { timeout: 7000 });
        const data = response.data || {};
        if (
            typeof data.fraud_score !== 'number' ||
            typeof data.recommendation !== 'string' ||
            typeof data.payout_amount !== 'number'
        ) {
            throw new Error('Invalid response contract from fraud validation service');
        }
        return data;
    } catch (err) {
        fastify.log.warn(`Fraud validation API failed, using backend fallback: ${err.message}`);
        return null;
    }
}

// ─── Revenue Loss Estimation (LAYER 2 — Behavioral) ───
// Calculates how much income a worker lost based on disruption severity and their earnings
function calculateRevenueLoss(worker, severity, coverageCap) {
    const avgWeekly = worker.avg_weekly_earnings || 3000;
    const hourlyRate = avgWeekly / WORKING_HOURS_PER_WEEK;

    const config = SEVERITY_CONFIG[severity.toUpperCase()] || SEVERITY_CONFIG.MEDIUM;
    const disruptionHours = config.hours;
    const severityMultiplier = config.multiplier;

    // Raw lost revenue = hourly rate × disruption hours
    const rawLostRevenue = hourlyRate * disruptionHours;

    // Apply severity multiplier
    const adjustedLoss = rawLostRevenue * severityMultiplier;

    // Cap at policy coverage limit
    const cappedLoss = Math.min(adjustedLoss, coverageCap);

    return {
        hourly_rate: Math.round(hourlyRate * 100) / 100,
        disruption_hours: disruptionHours,
        severity_multiplier: severityMultiplier,
        raw_lost_revenue: Math.round(rawLostRevenue * 100) / 100,
        adjusted_loss: Math.round(adjustedLoss * 100) / 100,
        capped_loss: Math.round(cappedLoss * 100) / 100,
        avg_weekly_earnings: avgWeekly,
        coverage_cap: coverageCap
    };
}


// ═══════════════════════════════════════════════════════════
//  LAYER 3 — CLUSTER CONSENSUS CHECK
//  ≥60% of zone workers must show claims for this event
//  to validate it as genuine zone-wide disruption
// ═══════════════════════════════════════════════════════════
async function checkClusterConsensus(client, zoneId, triggerId, eventDate, currentWorkerIncluded = true) {
    try {
        // Count total active workers with policies in this zone
        const totalResult = await client.query(
            `SELECT COUNT(DISTINCT w.id) AS total
             FROM workers w
             JOIN policies p ON p.worker_id = w.id
             WHERE w.zone_id = $1
               AND w.is_active = true
               AND p.status = 'ACTIVE'
               AND p.week_start <= $2::date
               AND p.week_end >= $2::date`,
            [zoneId, eventDate]
        );
        const totalWorkers = parseInt(totalResult.rows[0]?.total || 0);

        // Count workers who already have claims for this trigger today
        const claimedResult = await client.query(
            `SELECT COUNT(DISTINCT c.worker_id) AS claimed
             FROM claims c
             WHERE c.trigger_id = $1
               AND DATE(c.initiated_at) = $2::date
               AND c.worker_id IN (
                   SELECT w.id FROM workers w WHERE w.zone_id = $3
               )`,
            [triggerId, eventDate, zoneId]
        );
        let claimedWorkers = parseInt(claimedResult.rows[0]?.claimed || 0);

        // Include the current worker being processed (they haven't been inserted yet)
        if (currentWorkerIncluded) {
            claimedWorkers += 1;
        }

        // Ratio = workers who claimed (including current) / total eligible workers
        const ratio = totalWorkers > 0 ? claimedWorkers / totalWorkers : 0;

        let penalty = 0;
        let flag = null;

        // Per plan: penalize if claim ratio < 60% — this means
        // the disruption is NOT zone-wide and may be isolated/spoofed
        // Only apply when we have enough data (>3 workers) to be meaningful
        if (totalWorkers > 3 && ratio < 0.60) {
            penalty = 0.15;
            flag = 'CLUSTER_LOW_CONSENSUS';
        }

        return {
            zone_workers: totalWorkers,
            zone_claims: claimedWorkers,
            ratio: Math.round(ratio * 100) / 100,
            penalty,
            flag,
            status: penalty > 0 ? 'SUSPICIOUS' : 'PASS'
        };
    } catch (err) {
        // If query fails, don't block the claim — return neutral
        return {
            zone_workers: 0,
            zone_claims: 0,
            ratio: 0,
            penalty: 0,
            flag: null,
            status: 'CHECK_FAILED',
            error: err.message
        };
    }
}


// ═══════════════════════════════════════════════════════════
//  LAYER 4 — TEMPORAL ANOMALY DETECTION
//  Catches suspicious patterns: new accounts, consecutive
//  weekly claims, high claim velocity
// ═══════════════════════════════════════════════════════════
async function checkTemporalAnomaly(client, workerId, tenureWeeks) {
    let penalty = 0;
    const flags = [];
    const details = {};

    try {
        // Check 1: New account claiming early (tenure < 2 weeks)
        if (tenureWeeks < 2) {
            penalty += 0.10;
            flags.push('NEW_ACCOUNT_CLAIM');
            details.new_account = true;
        } else {
            details.new_account = false;
        }

        // Check 2: Consecutive week claims (3+ consecutive weeks with claims)
        const consecutiveResult = await client.query(
            `SELECT DATE(initiated_at) AS claim_date
             FROM claims
             WHERE worker_id = $1
               AND initiated_at >= NOW() - INTERVAL '28 days'
             ORDER BY initiated_at DESC`,
            [workerId]
        );

        // Group claims by ISO week
        const weekSet = new Set();
        for (const row of consecutiveResult.rows) {
            const d = new Date(row.claim_date);
            const weekNum = getISOWeek(d);
            const yearWeek = `${d.getFullYear()}-W${weekNum}`;
            weekSet.add(yearWeek);
        }

        const consecutiveWeeks = countConsecutiveWeeks(Array.from(weekSet));
        details.consecutive_claim_weeks = consecutiveWeeks;

        if (consecutiveWeeks >= 3) {
            penalty += 0.10;
            flags.push('CONSECUTIVE_WEEKLY_CLAIMS');
        }

        // Check 3: High claim velocity (>2 claims in last 7 days)
        const velocityResult = await client.query(
            `SELECT COUNT(*) AS claim_count
             FROM claims
             WHERE worker_id = $1
               AND initiated_at >= NOW() - INTERVAL '7 days'`,
            [workerId]
        );
        const velocity7d = parseInt(velocityResult.rows[0]?.claim_count || 0);
        details.velocity_7d = velocity7d;

        if (velocity7d > 2) {
            penalty += 0.15;
            flags.push('HIGH_CLAIM_VELOCITY');
        }

        return {
            tenure_weeks: tenureWeeks,
            consecutive_claims: consecutiveWeeks,
            velocity_7d: velocity7d,
            penalty: Math.round(penalty * 100) / 100,
            flags,
            details,
            status: penalty > 0 ? 'FLAGGED' : 'PASS'
        };
    } catch (err) {
        return {
            tenure_weeks: tenureWeeks,
            consecutive_claims: 0,
            velocity_7d: 0,
            penalty: 0,
            flags: [],
            details: {},
            status: 'CHECK_FAILED',
            error: err.message
        };
    }
}


// Helper: Get ISO week number
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}


// Helper: Count max consecutive weeks in a set of year-week strings
function countConsecutiveWeeks(yearWeeks) {
    if (yearWeeks.length < 2) return yearWeeks.length;

    // Parse year-week strings and sort
    const parsed = yearWeeks.map(yw => {
        const [year, week] = yw.split('-W').map(Number);
        return { year, week, total: year * 52 + week };
    }).sort((a, b) => a.total - b.total);

    let maxConsecutive = 1;
    let currentRun = 1;

    for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].total - parsed[i-1].total === 1) {
            currentRun++;
            maxConsecutive = Math.max(maxConsecutive, currentRun);
        } else {
            currentRun = 1;
        }
    }

    return maxConsecutive;
}


// ═══════════════════════════════════════════════════════════
//  COMPOSITE FRAUD SCORING — All 4 Layers Combined
// ═══════════════════════════════════════════════════════════
function computeSmartPayout(revenueLoss, mlRiskScore, clusterResult, temporalResult) {
    // ─── Composite fraud score from all layers ───
    const clusterPenalty = clusterResult?.penalty || 0;
    const temporalPenalty = temporalResult?.penalty || 0;

    // Composite = ML base + cluster adjustment + temporal adjustment
    // Capped at 1.0
    const compositeScore = Math.min(mlRiskScore + clusterPenalty + temporalPenalty, 1.0);

    // Fraud penalty applied to payout: cap at 80% — never zero out completely
    const fraudPenalty = Math.min(compositeScore, 0.8);
    const finalPayout = revenueLoss.capped_loss * (1 - fraudPenalty);

    let recommendation = 'AUTO_APPROVE';
    const flags = [];

    // ML risk flags
    if (mlRiskScore >= 0.7) {
        flags.push('HIGH_RISK_ML_SCORE');
    } else if (mlRiskScore >= 0.5) {
        flags.push('ELEVATED_RISK');
    }

    // Add cluster consensus flags
    if (clusterResult?.flag) {
        flags.push(clusterResult.flag);
    }

    // Add temporal anomaly flags
    if (temporalResult?.flags) {
        flags.push(...temporalResult.flags);
    }

    // Determine recommendation based on composite score
    if (compositeScore >= 0.7) {
        recommendation = 'HOLD';
    } else if (compositeScore >= 0.5) {
        recommendation = 'PARTIAL_PAYOUT';
    }

    return {
        payout_amount: Math.round(finalPayout * 100) / 100,
        fraud_score: Math.round(compositeScore * 1000) / 1000,
        recommendation,
        flags,
        breakdown: {
            hourly_rate: revenueLoss.hourly_rate,
            disruption_hours: revenueLoss.disruption_hours,
            severity_multiplier: revenueLoss.severity_multiplier,
            raw_lost_revenue: revenueLoss.raw_lost_revenue,
            capped_at_coverage: revenueLoss.capped_loss,
            fraud_penalty: `${(fraudPenalty * 100).toFixed(0)}%`,
            final_payout: Math.round(finalPayout * 100) / 100,
            // ── Full 5-layer fraud analysis breakdown ──
            fraud_layers: {
                ml_risk_score: Math.round(mlRiskScore * 1000) / 1000,
                behavioral_severity: {
                    disruption_hours: revenueLoss.disruption_hours,
                    severity_multiplier: revenueLoss.severity_multiplier,
                    status: 'APPLIED'
                },
                cluster_consensus: {
                    zone_workers: clusterResult?.zone_workers || 0,
                    zone_claims: clusterResult?.zone_claims || 0,
                    ratio: clusterResult?.ratio || 0,
                    penalty: clusterPenalty,
                    status: clusterResult?.status || 'UNKNOWN'
                },
                temporal_anomaly: {
                    tenure_weeks: temporalResult?.tenure_weeks || 0,
                    consecutive_claims: temporalResult?.consecutive_claims || 0,
                    velocity_7d: temporalResult?.velocity_7d || 0,
                    penalty: temporalPenalty,
                    flags: temporalResult?.flags || [],
                    status: temporalResult?.status || 'UNKNOWN'
                },
                composite_score: Math.round(compositeScore * 1000) / 1000,
                layers_active: [
                    'L1_ML_RISK_SCORE',
                    'L2_BEHAVIORAL_SEVERITY',
                    'L3_CLUSTER_CONSENSUS',
                    'L4_TEMPORAL_ANOMALY'
                ]
            }
        }
    };
}


export default async function claimRoutes(fastify) {
    // POST /claim/initiate
    fastify.post('/claim/initiate', async (request, reply) => {
        const body = request.body || {};
        const zoneId = String(body.zone_id || '').trim();
        const triggerId = String(body.trigger_id || '').trim();
        const severity = String(body.severity || 'HIGH').toUpperCase();
        const disruptionStart = body.disruption_start ? new Date(body.disruption_start) : new Date();
        const disruptionEnd = body.disruption_end ? new Date(body.disruption_end) : null;
        const affectedWorkers = Array.isArray(body.affected_workers) ? body.affected_workers : [];

        if (!zoneId || !triggerId) {
            return reply.status(400).send({ error: 'zone_id and trigger_id are required' });
        }
        if (Number.isNaN(disruptionStart.getTime())) {
            return reply.status(400).send({ error: 'disruption_start must be a valid ISO timestamp' });
        }

        const eventDate = disruptionStart.toISOString().slice(0, 10);
        const client = await fastify.pg.connect();

        try {
            await client.query('BEGIN');

            const zoneResult = await client.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
            if (zoneResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return reply.status(404).send({ error: `Zone ${zoneId} not found` });
            }

            await client.query(
                `INSERT INTO disruption_events (id, zone_id, trigger_id, severity, disruption_start, started_at, sensor_source)
                 VALUES ($1, $2, $3, $4, $5, $5, $6)`,
                [generateEventId(), zoneId, triggerId, severity, disruptionStart.toISOString(), body.sensor_source || 'AUTOMATED']
            );

            // Fetch workers with their earnings data for revenue-loss calculation
            const queryParams = [zoneId, eventDate];
            let workersSql = `
                SELECT
                    w.id AS worker_id,
                    w.zone_id,
                    w.upi_id,
                    w.name AS worker_name,
                    w.avg_weekly_earnings,
                    w.tenure_weeks,
                    w.daily_active_hours,
                    w.weekly_delivery_days,
                    w.earnings_std_dev,
                    w.claim_count_90d,
                    w.is_part_time,
                    w.device_fingerprint,
                    w.latest_risk_score,
                    p.id AS policy_id,
                    p.coverage_cap,
                    z.avg_disruption_days AS zone_disruption_days,
                    z.aqi_baseline AS zone_aqi_baseline,
                    z.flood_history AS is_flood_prone_zone
                FROM workers w
                JOIN policies p ON p.worker_id = w.id
                JOIN zones z ON z.id = w.zone_id
                WHERE w.zone_id = $1
                  AND w.is_active = true
                  AND p.status = 'ACTIVE'
                  AND p.week_start <= $2::date
                  AND p.week_end >= $2::date
            `;

            if (affectedWorkers.length > 0) {
                queryParams.push(affectedWorkers);
                workersSql += ` AND w.id = ANY($3::text[])`;
            }

            const workersResult = await client.query(workersSql, queryParams);

            if (workersResult.rows.length === 0) {
                await client.query('COMMIT');
                return reply.send({
                    claims_created: 0,
                    skipped_existing: 0,
                    auto_approved: 0,
                    held: 0,
                    message: 'No active policies found for this event window',
                    claims: []
                });
            }

            let claimsCreated = 0;
            let skippedExisting = 0;
            let autoApproved = 0;
            let held = 0;
            const claimDetails = [];

            for (const worker of workersResult.rows) {
                const claimId = generateClaimId();
                const duplicateCheck = await client.query(
                    `SELECT id
                     FROM claims
                     WHERE policy_id = $1
                       AND trigger_id = $2
                       AND DATE(initiated_at) = $3::date
                     LIMIT 1`,
                    [worker.policy_id, triggerId, eventDate]
                );

                if (duplicateCheck.rows.length > 0) {
                    skippedExisting++;
                    continue;
                }

                const fraudServiceResult = await validateFraudWithService(fastify, {
                    claim_id: claimId,
                    worker_id: worker.worker_id,
                    zone_id: zoneId,
                    trigger_id: triggerId,
                    disruption_start: disruptionStart.toISOString(),
                    disruption_end: disruptionEnd ? disruptionEnd.toISOString() : null,
                    worker_gps_lat: body.worker_gps_lat ?? null,
                    worker_gps_lng: body.worker_gps_lng ?? null,
                    gps_accuracy_meters: body.gps_accuracy_meters ?? null,
                    accelerometer_stationary: body.accelerometer_stationary ?? false,
                    cell_tower_zone_match: body.cell_tower_zone_match ?? true,
                    device_fingerprint: body.device_fingerprint || worker.device_fingerprint || null,
                    wifi_bssid: body.wifi_bssid || null,
                    coverage_cap: worker.coverage_cap,
                    avg_weekly_earnings: worker.avg_weekly_earnings,
                    tenure_weeks: worker.tenure_weeks
                });

                let smartPayout;
                let riskResult = { source: 'fraud_service' };

                if (fraudServiceResult) {
                    smartPayout = {
                        payout_amount: fraudServiceResult.payout_amount,
                        fraud_score: fraudServiceResult.fraud_score,
                        recommendation: fraudServiceResult.recommendation,
                        flags: fraudServiceResult.flags || [],
                        breakdown: {
                            source: 'fraud_validation_service',
                            severity,
                            layers_triggered: fraudServiceResult.layers_triggered || []
                        }
                    };
                } else {
                    // ─── LAYER 1: ML Risk Score ───
                    riskResult = await fetchRiskScore(fastify, {
                        tenure_weeks: worker.tenure_weeks,
                        daily_active_hours: worker.daily_active_hours,
                        weekly_delivery_days: worker.weekly_delivery_days,
                        avg_weekly_earnings: worker.avg_weekly_earnings,
                        earnings_std_dev: worker.earnings_std_dev,
                        claim_count_90d: worker.claim_count_90d,
                        zone_disruption_days: worker.zone_disruption_days || 15,
                        zone_aqi_baseline: worker.zone_aqi_baseline || 100,
                        is_flood_prone_zone: worker.is_flood_prone_zone ? 1 : 0,
                        is_part_time: worker.is_part_time ? 1 : 0,
                        latest_risk_score: worker.latest_risk_score
                    });

                    // ─── LAYER 2: Revenue Loss (Behavioral Severity) ───
                    const revenueLoss = calculateRevenueLoss(worker, severity, worker.coverage_cap);

                    // ─── LAYER 3: Cluster Consensus ───
                    const clusterResult = await checkClusterConsensus(
                        client, zoneId, triggerId, eventDate
                    );

                    // ─── LAYER 4: Temporal Anomaly ───
                    const temporalResult = await checkTemporalAnomaly(
                        client, worker.worker_id, worker.tenure_weeks || 0
                    );

                    // ─── COMPOSITE: Smart Payout with all 4 layers ───
                    smartPayout = computeSmartPayout(
                        revenueLoss,
                        riskResult.risk_score,
                        clusterResult,
                        temporalResult
                    );
                }

                const claimStatus = mapClaimStatus(smartPayout.recommendation);

                await client.query(
                    `INSERT INTO claims (id, policy_id, worker_id, trigger_id, fraud_score, recommendation, payout_amount, status, flags, breakdown)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        claimId,
                        worker.policy_id,
                        worker.worker_id,
                        triggerId,
                        smartPayout.fraud_score,
                        smartPayout.recommendation,
                        smartPayout.payout_amount,
                        claimStatus,
                        JSON.stringify(smartPayout.flags),
                        JSON.stringify(smartPayout.breakdown)
                    ]
                );

                claimsCreated++;
                if (claimStatus === 'APPROVED') autoApproved++;
                if (claimStatus === 'HOLD') held++;

                claimDetails.push({
                    id: claimId,
                    worker_id: worker.worker_id,
                    worker_name: worker.worker_name,
                    payout_amount: smartPayout.payout_amount,
                    fraud_score: smartPayout.fraud_score,
                    risk_source: riskResult.source,
                    recommendation: smartPayout.recommendation,
                    status: claimStatus,
                    upi_id: worker.upi_id,
                    breakdown: smartPayout.breakdown
                });
            }

            await client.query('COMMIT');

            return reply.send({
                claims_created: claimsCreated,
                skipped_existing: skippedExisting,
                auto_approved: autoApproved,
                held,
                severity,
                fraud_layers_active: process.env.FRAUD_VALIDATE_URL
                    ? ['L1_ZONE_MATCH', 'L2_BEHAVIORAL_DEVIATION', 'L3_CLUSTER_CONSENSUS', 'L4_TEMPORAL_ANOMALY', 'L5_ANTI_SPOOF']
                    : ['L1_ML_RISK_SCORE', 'L2_BEHAVIORAL_SEVERITY', 'L3_CLUSTER_CONSENSUS', 'L4_TEMPORAL_ANOMALY'],
                claims: claimDetails
            });
        } catch (err) {
            await client.query('ROLLBACK');
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Claim initiation failed', details: err.message });
        } finally {
            client.release();
        }
    });
}
