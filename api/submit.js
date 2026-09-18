const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 20;

const ALLOWED_TABLES = {
  survey: 'survey_responses',
  screened_out: 'screened_out',
  raffle: 'raffle_entries',
};

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function sbHeaders(serviceKey, extra) {
  return {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function buildRow(recordType, body) {
  if (recordType === 'survey') {
    return {
      participant_id: body.participant_id,
      study_id: body.study_id,
      currency: body.currency || null,
      amount_eur: body.amount_eur || null,
      submitted_at: body.finished_at || body.submitted_at || new Date().toISOString(),
      payload: body,
    };
  }
  if (recordType === 'screened_out') {
    return {
      study_id: body.study_id,
      reason: body.reason,
      age: body.age != null ? Number(body.age) : null,
      traffic_source: body.traffic_source || null,
    };
  }
  if (recordType === 'raffle') {
    return {
      study_id: body.study_id,
      email: body.email,
      traffic_source: body.traffic_source || null,
    };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: 'server not configured' });
    return;
  }
  const baseUrl = supabaseUrl.replace(/\/$/, '');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      res.status(400).json({ error: 'invalid json' });
      return;
    }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'invalid body' });
    return;
  }

  const table = ALLOWED_TABLES[body.record_type];
  if (!table) {
    res.status(400).json({ error: 'invalid record_type' });
    return;
  }

  const row = buildRow(body.record_type, body);
  if (!row) {
    res.status(400).json({ error: 'could not build row' });
    return;
  }

  const ip = getClientIp(req);

  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const countUrl = baseUrl + '/rest/v1/rate_limit_log?select=id&ip=eq.' +
      encodeURIComponent(ip) + '&created_at=gte.' + encodeURIComponent(since);
    const countRes = await fetch(countUrl, {
      method: 'GET',
      headers: sbHeaders(serviceKey, { Prefer: 'count=exact' }),
    });
    const contentRange = countRes.headers.get('content-range') || '';
    const count = parseInt(contentRange.split('/')[1] || '0', 10);
    if (count >= RATE_LIMIT_MAX) {
      res.status(429).json({ error: 'too many requests, try again later' });
      return;
    }

    const insertRes = await fetch(baseUrl + '/rest/v1/' + table, {
      method: 'POST',
      headers: sbHeaders(serviceKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    if (!insertRes.ok) {
      const text = await insertRes.text();
      res.status(insertRes.status).json({ error: text || 'insert failed' });
      return;
    }

    fetch(baseUrl + '/rest/v1/rate_limit_log', {
      method: 'POST',
      headers: sbHeaders(serviceKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ ip }),
    }).catch(() => {});

    res.status(200).json({ status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
