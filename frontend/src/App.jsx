/**
 * LiMeiHua Taproot Airdrop Zone - Frontend Dashboard
 * 
 * ชุดซอฟต์แวร์ชุดนี้ มีไว้เพื่อเป็นโครงสร้างพื้นฐานทางการเงินยุคใหม่
 * เพื่อรองรับการไหลของเงินจำนวนมหาศาลของท่านผู้เฒ่าหลี่เหมยฮัว หรือ LiMeiHua Grand Mother
 * และ source code นี้สร้างโดย Mr.Kanutsanan Pongpanna (นายคณัสนันท์ พงษ์พันนา)
 * URL: https://chatgpt.com/g/g-68d289535dec81919445deb9830f2d8e-kanutsanan-pongpanna
 */

import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [userRole, setUserRole] = useState(null); // 'admin' or 'user'
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load campaigns on mount
  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ==================== ADMIN FUNCTIONS ====================

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await response.json();

      if (data.success) {
        setUserRole('admin');
        localStorage.setItem('adminToken', data.token);
        setMessage('✅ Admin login successful');
      } else {
        setMessage('❌ ' + (data.error || 'Login failed'));
      }
    } catch (error) {
      setMessage('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target);
      const response = await fetch('http://localhost:3000/api/admin/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          tokenSymbol: formData.get('tokenSymbol'),
          totalAmount: formData.get('totalAmount'),
          tokenDecimals: formData.get('tokenDecimals'),
          claimDeadline: formData.get('claimDeadline'),
          maxClaimsPerUser: formData.get('maxClaimsPerUser')
        })
      });
      const data = await response.json();

      if (data.success) {
        setMessage('✅ Campaign created successfully');
        fetchCampaigns();
        e.target.reset();
      } else {
        setMessage('❌ ' + (data.error || 'Failed to create campaign'));
      }
    } catch (error) {
      setMessage('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpload = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) {
      setMessage('❌ Please select a campaign');
      return;
    }

    setLoading(true);
    try {
      const file = e.target.csvFile.files[0];
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const recipients = lines.slice(1).map(line => {
        const [address, amount] = line.split(',');
        return { address: address.trim(), amount: parseFloat(amount) };
      });

      const response = await fetch(
        `http://localhost:3000/api/admin/campaigns/${selectedCampaign.id}/batch-upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients })
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchCampaigns();
      } else {
        setMessage('❌ ' + (data.error || 'Upload failed'));
      }
    } catch (error) {
      setMessage('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== USER FUNCTIONS ====================

  const handleCheckEligibility = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) {
      setMessage('❌ Please select a campaign');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/campaigns/${selectedCampaign.id}/check-eligibility?address=${userAddress}`
      );
      const data = await response.json();

      if (data.eligible) {
        setMessage(`✅ Eligible! You can claim ${data.airdrop.amount} ${data.campaign.tokenSymbol}`);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (error) {
      setMessage('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAirdrop = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) {
      setMessage('❌ Please select a campaign');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/campaigns/${selectedCampaign.id}/claim`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: userAddress,
            signature: 'mock_signature_' + Date.now()
          })
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message} TX: ${data.claim.txHash}`);
      } else {
        setMessage('❌ ' + (data.error || 'Claim failed'));
      }
    } catch (error) {
      setMessage('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('adminToken');
    setAdminEmail('');
    setAdminPassword('');
    setMessage('✅ Logged out');
  };

  // ==================== RENDER ====================

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🎁 LiMeiHua Taproot Airdrop Zone</h1>
          <p>Lightning Network Airdrop Distribution System</p>
        </div>
        {userRole && (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      <div className="container">
        {message && (
          <div className="message-box">
            {message}
          </div>
        )}

        {!userRole ? (
          <div className="auth-section">
            <div className="auth-card">
              <h2>Admin Login</h2>
              <form onSubmit={handleAdminLogin}>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@limeihua.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="admin123"
                    required
                  />
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login as Admin'}
                </button>
              </form>
            </div>

            <div className="user-section">
              <h2>User: Check Eligibility</h2>
              <div className="form-group">
                <label>Your Bitcoin Address:</label>
                <input
                  type="text"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="1A1z7agoat..."
                />
              </div>
            </div>
          </div>
        ) : userRole === 'admin' ? (
          <div className="admin-section">
            <div className="tabs">
              <button className="tab active">Campaigns</button>
              <button className="tab">Create Campaign</button>
              <button className="tab">Batch Upload</button>
            </div>

            <div className="tab-content">
              <h2>Active Campaigns</h2>
              {campaigns.length > 0 ? (
                <div className="campaigns-grid">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="campaign-card">
                      <h3>{campaign.name}</h3>
                      <p><strong>Token:</strong> {campaign.tokenSymbol}</p>
                      <p><strong>Recipients:</strong> {campaign.recipientCount}</p>
                      <p><strong>Claimed:</strong> {campaign.claimedCount}</p>
                      <p><strong>Total:</strong> {campaign.totalAmount}</p>
                      <button
                        className="select-btn"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No campaigns yet</p>
              )}
            </div>

            <div className="tab-content">
              <h2>Create New Campaign</h2>
              <form onSubmit={handleCreateCampaign}>
                <div className="form-group">
                  <label>Campaign Name:</label>
                  <input type="text" name="name" required />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <input type="text" name="description" />
                </div>
                <div className="form-group">
                  <label>Token Symbol:</label>
                  <input type="text" name="tokenSymbol" required />
                </div>
                <div className="form-group">
                  <label>Total Amount:</label>
                  <input type="number" name="totalAmount" step="0.01" required />
                </div>
                <div className="form-group">
                  <label>Decimals:</label>
                  <input type="number" name="tokenDecimals" defaultValue="18" />
                </div>
                <div className="form-group">
                  <label>Claim Deadline:</label>
                  <input type="datetime-local" name="claimDeadline" required />
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Campaign'}
                </button>
              </form>
            </div>

            <div className="tab-content">
              <h2>Batch Upload Recipients</h2>
              {selectedCampaign ? (
                <form onSubmit={handleBatchUpload}>
                  <p><strong>Campaign:</strong> {selectedCampaign.name}</p>
                  <div className="form-group">
                    <label>CSV File (address, amount):</label>
                    <input type="file" name="csvFile" accept=".csv" required />
                  </div>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Uploading...' : 'Upload Recipients'}
                  </button>
                </form>
              ) : (
                <p className="empty-state">Select a campaign first</p>
              )}
            </div>
          </div>
        ) : null}

        {!userRole && (
          <div className="campaigns-section">
            <h2>Available Campaigns</h2>
            {campaigns.length > 0 ? (
              <div className="campaigns-grid">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="campaign-card">
                    <h3>{campaign.name}</h3>
                    <p>{campaign.description}</p>
                    <p><strong>Token:</strong> {campaign.tokenSymbol}</p>
                    <p><strong>Total:</strong> {campaign.totalAmount}</p>
                    <button
                      className="select-btn"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No campaigns available</p>
            )}

            {selectedCampaign && (
              <div className="user-claim-section">
                <h2>Claim Airdrop</h2>
                <p><strong>Campaign:</strong> {selectedCampaign.name}</p>
                <form onSubmit={handleClaimAirdrop}>
                  <div className="form-group">
                    <label>Your Bitcoin Address:</label>
                    <input
                      type="text"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="1A1z7agoat..."
                      required
                    />
                  </div>
                  <button type="button" className="submit-btn" onClick={handleCheckEligibility}>
                    Check Eligibility
                  </button>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Claiming...' : 'Claim Airdrop'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {stats && (
          <div className="stats-section">
            <h2>Global Statistics</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-value">{stats.totalCampaigns}</div>
                <div className="stat-label">Total Campaigns</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.activeCampaigns}</div>
                <div className="stat-label">Active Campaigns</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.totalRecipients}</div>
                <div className="stat-label">Total Recipients</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.totalClaimed}</div>
                <div className="stat-label">Total Claimed</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.claimRate}</div>
                <div className="stat-label">Claim Rate</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{stats.totalAmount.toFixed(2)}</div>
                <div className="stat-label">Total Amount</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>LiMeiHua Taproot Airdrop Zone | Dedicated to LiMeiHua Grand Mother | Created by Mr. Kanutsanan Pongpanna</p>
      </footer>
    </div>
  );
}
