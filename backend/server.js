/**
 * LiMeiHua Taproot Airdrop Zone - Backend Server
 * 
 * ชุดซอฟต์แวร์ชุดนี้ มีไว้เพื่อเป็นโครงสร้างพื้นฐานทางการเงินยุคใหม่
 * เพื่อรองรับการไหลของเงินจำนวนมหาศาลของท่านผู้เฒ่าหลี่เหมยฮัว หรือ LiMeiHua Grand Mother
 * และ source code นี้สร้างโดย Mr.Kanutsanan Pongpanna (นายคณัสนันท์ พงษ์พันนา)
 * URL: https://chatgpt.com/g/g-68d289535dec81919445deb9830f2d8e-kanutsanan-pongpanna
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory database (replace with real DB in production)
const airdropCampaigns = new Map();
const userClaims = new Map();
const adminUsers = new Map();

// Initialize admin user
adminUsers.set('admin@limeihua.com', {
  id: uuidv4(),
  email: 'admin@limeihua.com',
  password: 'admin123', // In production, use hashed passwords
  role: 'admin',
  createdAt: new Date()
});

// ==================== ADMIN ROUTES ====================

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
app.post('/api/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = adminUsers.get(email);
    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      token: `token_${admin.id}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/campaigns/create
 * Create new airdrop campaign
 */
app.post('/api/admin/campaigns/create', (req, res) => {
  try {
    const {
      name,
      description,
      tokenSymbol,
      totalAmount,
      tokenDecimals,
      claimDeadline,
      maxClaimsPerUser
    } = req.body;

    if (!name || !tokenSymbol || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const campaignId = uuidv4();
    const campaign = {
      id: campaignId,
      name,
      description,
      tokenSymbol,
      totalAmount: parseFloat(totalAmount),
      tokenDecimals: parseInt(tokenDecimals) || 18,
      claimDeadline: new Date(claimDeadline),
      maxClaimsPerUser: parseInt(maxClaimsPerUser) || 1,
      status: 'active',
      createdAt: new Date(),
      recipients: [],
      claimedAmount: 0,
      claimCount: 0
    };

    airdropCampaigns.set(campaignId, campaign);

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/campaigns/:campaignId/batch-upload
 * Upload batch recipients for airdrop
 */
app.post('/api/admin/campaigns/:campaignId/batch-upload', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { recipients } = req.body; // Array of { address, amount }

    const campaign = airdropCampaigns.get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Invalid recipients array' });
    }

    // Add recipients to campaign
    const addedRecipients = recipients.map(r => ({
      id: uuidv4(),
      address: r.address,
      amount: parseFloat(r.amount),
      claimed: false,
      claimedAt: null,
      claimTxHash: null
    }));

    campaign.recipients.push(...addedRecipients);

    res.json({
      success: true,
      message: `Added ${addedRecipients.length} recipients`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        recipientCount: campaign.recipients.length,
        totalAmount: campaign.totalAmount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/campaigns/:campaignId
 * Get campaign details
 */
app.get('/api/admin/campaigns/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = airdropCampaigns.get(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const stats = {
      totalRecipients: campaign.recipients.length,
      claimedCount: campaign.recipients.filter(r => r.claimed).length,
      unclaimedCount: campaign.recipients.filter(r => !r.claimed).length,
      claimedAmount: campaign.recipients
        .filter(r => r.claimed)
        .reduce((sum, r) => sum + r.amount, 0),
      unclaimedAmount: campaign.recipients
        .filter(r => !r.claimed)
        .reduce((sum, r) => sum + r.amount, 0)
    };

    res.json({
      success: true,
      campaign: {
        ...campaign,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/campaigns
 * List all campaigns
 */
app.get('/api/admin/campaigns', (req, res) => {
  try {
    const campaigns = Array.from(airdropCampaigns.values()).map(c => ({
      id: c.id,
      name: c.name,
      tokenSymbol: c.tokenSymbol,
      status: c.status,
      recipientCount: c.recipients.length,
      claimedCount: c.recipients.filter(r => r.claimed).length,
      createdAt: c.createdAt
    }));

    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER ROUTES ====================

/**
 * GET /api/campaigns/:campaignId/check-eligibility
 * Check if user is eligible for airdrop
 */
app.get('/api/campaigns/:campaignId/check-eligibility', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    const campaign = airdropCampaigns.get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const recipient = campaign.recipients.find(r => r.address === address);

    if (!recipient) {
      return res.json({
        eligible: false,
        message: 'Address not eligible for this airdrop'
      });
    }

    res.json({
      eligible: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        tokenSymbol: campaign.tokenSymbol
      },
      airdrop: {
        amount: recipient.amount,
        claimed: recipient.claimed,
        claimedAt: recipient.claimedAt,
        deadline: campaign.claimDeadline
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/campaigns/:campaignId/claim
 * Claim airdrop
 */
app.post('/api/campaigns/:campaignId/claim', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ error: 'Address and signature required' });
    }

    const campaign = airdropCampaigns.get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check deadline
    if (new Date() > campaign.claimDeadline) {
      return res.status(400).json({ error: 'Claim deadline has passed' });
    }

    const recipient = campaign.recipients.find(r => r.address === address);
    if (!recipient) {
      return res.status(404).json({ error: 'Address not eligible' });
    }

    if (recipient.claimed) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    // Mark as claimed
    recipient.claimed = true;
    recipient.claimedAt = new Date();
    recipient.claimTxHash = `0x${Math.random().toString(16).slice(2)}`; // Mock tx hash

    // Store claim record
    const claimId = uuidv4();
    userClaims.set(claimId, {
      id: claimId,
      campaignId,
      address,
      amount: recipient.amount,
      claimedAt: new Date(),
      txHash: recipient.claimTxHash
    });

    res.json({
      success: true,
      message: 'Airdrop claimed successfully',
      claim: {
        id: claimId,
        amount: recipient.amount,
        txHash: recipient.claimTxHash,
        campaign: campaign.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/user/claims/:address
 * Get user's claim history
 */
app.get('/api/user/claims/:address', (req, res) => {
  try {
    const { address } = req.params;

    const claims = Array.from(userClaims.values()).filter(c => c.address === address);

    res.json({
      success: true,
      address,
      claims,
      totalClaimed: claims.reduce((sum, c) => sum + c.amount, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PUBLIC ROUTES ====================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'LiMeiHua Taproot Airdrop Zone'
  });
});

/**
 * GET /api/campaigns
 * List all active campaigns
 */
app.get('/api/campaigns', (req, res) => {
  try {
    const campaigns = Array.from(airdropCampaigns.values())
      .filter(c => c.status === 'active')
      .map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        tokenSymbol: c.tokenSymbol,
        totalAmount: c.totalAmount,
        claimDeadline: c.claimDeadline,
        recipientCount: c.recipients.length,
        claimedCount: c.recipients.filter(r => r.claimed).length
      }));

    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get global statistics
 */
app.get('/api/stats', (req, res) => {
  try {
    const campaigns = Array.from(airdropCampaigns.values());
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients.length, 0);
    const totalClaimed = campaigns.reduce((sum, c) => sum + c.recipients.filter(r => r.claimed).length, 0);
    const totalAmount = campaigns.reduce((sum, c) => sum + c.totalAmount, 0);

    res.json({
      success: true,
      stats: {
        totalCampaigns,
        activeCampaigns,
        totalRecipients,
        totalClaimed,
        claimRate: totalRecipients > 0 ? ((totalClaimed / totalRecipients) * 100).toFixed(2) + '%' : '0%',
        totalAmount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

/**
 * 404 Not Found
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  LiMeiHua Taproot Airdrop Zone                             ║
║  Backend Server running on http://localhost:${PORT}              ║
║  Dedicated to LiMeiHua Grand Mother                         ║
║  Created by Mr. Kanutsanan Pongpanna                       ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
