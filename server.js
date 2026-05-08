import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

const BACKEND = "https://hivemorph.onrender.com";
const PORT = process.env.PORT || 3000;
const MCP_VERSION = "2024-11-05";

const SERVER_DESCRIPTION =
  "Hive DeedLock — real estate notarization, deed signing, and county recording attestations. Dual-signed (Ed25519 + ML-DSA-65) post-quantum-ready Swarm-MAPET receipt envelopes binding buyer + seller + property + state at every transition (Disclosure, Offer, Acceptance, Escrow_Open, Title_Search, Notary_Session, Deed_Signed, Recording_Submitted, Recorded, Closing, Wire_Disbursed). Field semantics aligned to ALTA UCD, MISMO 3.4, RON Standards v1.4, and PRIA recording XML. $0.0096/event Standard, $0.0192/event Cosmic (FinCEN GTO / 1099-S anchored / HUD-1 reconciled / inspected). USDC on Base 8453.";

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "deedlock_deed_attest",
    description:
      "Attest a deed/notary state transition (Disclosure, Offer, Acceptance, Escrow_Open, Title_Search, Notary_Session, Deed_Signed, Recording_Submitted, Recorded, Closing, Wire_Disbursed, Amendment, Cancellation) with a dual-signed (Ed25519 + ML-DSA-65) post-quantum-ready Swarm-MAPET receipt envelope. Field semantics aligned to ALTA UCD, MISMO 3.4, RON Standards v1.4, and PRIA recording XML. Standard tier $0.0096/event, Cosmic tier $0.0192/event for FinCEN GTO / 1099-S / HUD-1 / inspected jobs. USDC settlement on Base 8453.",
    inputSchema: {
      type: "object",
      properties: {
        buyer_did: { type: "string", description: "DID of the buyer (required)." },
        seller_did: { type: "string", description: "DID of the seller (required)." },
        property_id: { type: "string", description: "Stable property id, typically the APN (required)." },
        event_type: {
          type: "string",
          enum: ["disclosure","offer","acceptance","escrow_open","title_search","notary_session","deed_signed","recording_submitted","recorded","closing","wire_disbursed","amendment","cancellation"],
          description: "Real estate state-machine event (required).",
        },
        event_hash: { type: "string", description: "sha256 of the canonical document snapshot at this state (required)." },
        notary_did: { type: "string", description: "DID of the notary (optional, required for notary_session/deed_signed)." },
        title_agent_did: { type: "string", description: "DID of the title agent (optional)." },
        escrow_agent_did: { type: "string", description: "DID of the escrow agent (optional)." },
        lender_did: { type: "string", description: "DID of the lender (optional)." },
        property: {
          type: "object",
          description: "Property descriptor (apn, address, county, state, legal_description, parcel_size_sqft).",
        },
        sale_price_cents: { type: "integer", description: "Sale price in cents (optional)." },
        loan_amount_cents: { type: "integer", description: "Loan amount in cents (optional)." },
        currency: { type: "string", minLength: 3, maxLength: 3, description: "ISO 4217 currency code, default USD." },
        notarization_type: { type: "string", enum: ["in_person","ron","ipen","mail_away"], description: "Notarization modality (optional)." },
        recording_jurisdiction: { type: "string", description: "County/state recording jurisdiction (optional)." },
        recording_document_number: { type: "string", description: "County recorder document number (optional)." },
        prior_attestation_id: { type: "string", description: "Previous attestation id in the chain (optional)." },
        cosmic_tier: { type: "boolean", description: "Use Cosmic tier pricing for FinCEN GTO / 1099-S / HUD-1 / inspected closings (default false)." },
        metadata: { type: "object", description: "Free-form metadata (optional)." },
      },
      required: ["buyer_did","seller_did","property_id","event_type","event_hash"],
    },
  },
  {
    name: "deedlock_deed_get",
    description: "Fetch a stored DeedLock attestation by attestation_id.",
    inputSchema: {
      type: "object",
      properties: { attestation_id: { type: "string", description: "Attestation UUID (required)." } },
      required: ["attestation_id"],
    },
  },
  {
    name: "deedlock_deed_verify",
    description: "Verify a stored DeedLock attestation. Returns the record + freshly-computed dual-signature verification (Ed25519 + ML-DSA-65).",
    inputSchema: {
      type: "object",
      properties: { attestation_id: { type: "string", description: "Attestation UUID (required)." } },
      required: ["attestation_id"],
    },
  },
  {
    name: "deedlock_notary_session",
    description: "Attest a notary session (in-person, RON, IPEN, or mail-away) covering one or more documents. Binds notary + signers + documents into a dual-signed receipt envelope.",
    inputSchema: {
      type: "object",
      properties: {
        buyer_did: { type: "string", description: "Buyer DID (required)." },
        seller_did: { type: "string", description: "Seller DID (required)." },
        notary_did: { type: "string", description: "Notary DID (required)." },
        property_id: { type: "string", description: "Property id / APN (required)." },
        notarization_type: { type: "string", enum: ["in_person","ron","ipen","mail_away"], description: "Notarization modality (required)." },
        documents: { type: "array", description: "Array of document descriptors (name, hash, type) covered by this session (required)." },
        session_started_at: { type: "string", description: "ISO timestamp session started (optional)." },
        session_ended_at: { type: "string", description: "ISO timestamp session ended (optional)." },
        notary_commission_id: { type: "string", description: "Notary commission id (optional)." },
        notary_jurisdiction: { type: "string", description: "Notary jurisdiction (optional)." },
        cosmic_tier: { type: "boolean", description: "Use Cosmic tier pricing (default false)." },
        metadata: { type: "object", description: "Free-form metadata (optional)." },
      },
      required: ["buyer_did","seller_did","notary_did","property_id","notarization_type","documents"],
    },
  },
  {
    name: "deedlock_recording_attest",
    description: "Attest a county recording event. Validates chain-of-custody from the prior DEED_SIGNED attestation, then binds recording document number + recording jurisdiction + recording timestamp into a dual-signed receipt.",
    inputSchema: {
      type: "object",
      properties: {
        buyer_did: { type: "string", description: "Buyer DID (required)." },
        seller_did: { type: "string", description: "Seller DID (required)." },
        property_id: { type: "string", description: "Property id / APN (required)." },
        deed_signed_attestation_id: { type: "string", description: "Attestation id of the prior DEED_SIGNED record (required for chain-of-custody)." },
        recording_jurisdiction: { type: "string", description: "County/state recording jurisdiction (required)." },
        recording_document_number: { type: "string", description: "County recorder document number (required)." },
        recording_status: { type: "string", enum: ["submitted","accepted","rejected","recorded"], description: "Recording status (required)." },
        recorded_at: { type: "string", description: "ISO timestamp of recording (optional)." },
        cosmic_tier: { type: "boolean", description: "Use Cosmic tier pricing (default false)." },
        metadata: { type: "object", description: "Free-form metadata (optional)." },
      },
      required: ["buyer_did","seller_did","property_id","deed_signed_attestation_id","recording_jurisdiction","recording_document_number","recording_status"],
    },
  },
  {
    name: "deedlock_chain_verify",
    description: "Verify the full chain of attestations for a property. Confirms state-machine validity, no missing transitions, recording chain-of-custody, and returns any discrepancies.",
    inputSchema: {
      type: "object",
      properties: {
        property_id: { type: "string", description: "Property id / APN (required)." },
        require_recorded: { type: "boolean", description: "If true, fail unless the chain reaches RECORDED (default false)." },
      },
      required: ["property_id"],
    },
  },
  {
    name: "deedlock_by_property",
    description: "Full state-transition chain for a property, ordered by timestamp.",
    inputSchema: {
      type: "object",
      properties: { property_id: { type: "string", description: "Property id / APN (required)." } },
      required: ["property_id"],
    },
  },
  {
    name: "deedlock_by_buyer",
    description: "Paginated history of DeedLock attestations by buyer DID, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        buyer_did: { type: "string", description: "Buyer DID (required)." },
        limit: { type: "integer", description: "Max records (1-500, default 100)." },
        offset: { type: "integer", description: "Pagination offset (default 0)." },
      },
      required: ["buyer_did"],
    },
  },
  {
    name: "deedlock_by_seller",
    description: "Paginated history of DeedLock attestations by seller DID, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        seller_did: { type: "string", description: "Seller DID (required)." },
        limit: { type: "integer", description: "Max records (1-500, default 100)." },
        offset: { type: "integer", description: "Pagination offset (default 0)." },
      },
      required: ["seller_did"],
    },
  },
  {
    name: "deedlock_by_notary",
    description: "Paginated history of DeedLock attestations by notary DID, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        notary_did: { type: "string", description: "Notary DID (required)." },
        limit: { type: "integer", description: "Max records (1-500, default 100)." },
        offset: { type: "integer", description: "Pagination offset (default 0)." },
      },
      required: ["notary_did"],
    },
  },
  {
    name: "deedlock_pricing",
    description: "Per-event Standard / Cosmic tier pricing + annual contract bands.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "deedlock_health",
    description: "Service health: status, version, record count, writeable, supported notarization types and recording statuses.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ── MCP well-known manifest ──────────────────────────────────────────────────

app.get("/.well-known/mcp.json", (_req, res) => {
  res.json({
    mcp_version: MCP_VERSION,
    name: "hive-mcp-deedlock",
    description: SERVER_DESCRIPTION,
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    backend: BACKEND,
  });
});

// ── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "hive-mcp-deedlock", version: "1.0.0" });
});

// ── JSON-RPC 2.0 MCP endpoint ────────────────────────────────────────────────

app.post("/mcp", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  if (jsonrpc !== "2.0") {
    return res.status(400).json({ error: "invalid jsonrpc version" });
  }

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: MCP_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "hive-mcp-deedlock", version: "1.0.0" },
      },
    });
  }

  if (method === "tools/list") {
    return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params || {};
    try {
      const result = await dispatchTool(name, args || {});
      return res.json({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    } catch (err) {
      return res.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: err.message },
      });
    }
  }

  if (method === "notifications/initialized" || method === "ping") {
    return res.json({ jsonrpc: "2.0", id, result: {} });
  }

  return res.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});

app.listen(PORT, () => {
  console.log(`hive-mcp-deedlock listening on port ${PORT}`);
});

async function dispatchTool(name, args) {
  if (name === "deedlock_deed_attest") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/deed_attest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_deed_get") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/deed_get/${encodeURIComponent(args.attestation_id)}`);
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_deed_verify") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/deed_verify/${encodeURIComponent(args.attestation_id)}`);
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_notary_session") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/notary_session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_recording_attest") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/recording_attest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_chain_verify") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/chain_verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_by_property") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/by-property/${encodeURIComponent(args.property_id)}`);
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_by_buyer") {
    const { buyer_did, limit = 100, offset = 0 } = args;
    const qs = new URLSearchParams({ limit, offset });
    const resp = await fetch(`${BACKEND}/v1/deedlock/by-buyer/${encodeURIComponent(buyer_did)}?${qs}`);
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_by_seller") {
    const { seller_did, limit = 100, offset = 0 } = args;
    const qs = new URLSearchParams({ limit, offset });
    const resp = await fetch(`${BACKEND}/v1/deedlock/by-seller/${encodeURIComponent(seller_did)}?${qs}`);
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_by_notary") {
    const { notary_did, limit = 100, offset = 0 } = args;
    const qs = new URLSearchParams({ limit, offset });
    const resp = await fetch(`${BACKEND}/v1/deedlock/by-notary/${encodeURIComponent(notary_did)}?${qs}`);
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.detail || JSON.stringify(result));
    return result;
  }
  if (name === "deedlock_pricing") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/pricing`);
    return await resp.json();
  }
  if (name === "deedlock_health") {
    const resp = await fetch(`${BACKEND}/v1/deedlock/health`);
    return await resp.json();
  }
  throw new Error(`Unknown tool: ${name}`);
}
