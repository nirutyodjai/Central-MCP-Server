// Dashboard JavaScript for Central MCP Server
class MCPDashboard {
    constructor() {
        this.baseUrl = window.location.origin;
        this.refreshInterval = null;
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.startAutoRefresh();
        this.setupEventListeners();
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.updateServerStatus(),
                this.updateServerList(),
                this.updateMetrics(),
                this.updateCapabilities(),
                this.checkAlerts()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('Error loading dashboard data. Please check your connection.', 'error');
        }
    }

    async updateServerStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            const data = await response.json();
            
            const statusElement = document.getElementById('serverStatus');
            if (data.status === 'healthy') {
                statusElement.className = 'status-indicator';
                statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Server Online</span>';
            } else {
                statusElement.className = 'status-indicator offline';
                statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Server Issues</span>';
            }

            // Update server count
            const serverCount = data.mcpServers?.totalServers || 0;
            document.getElementById('serverCount').textContent = serverCount;

            // Update healthy count
            const healthyCount = data.mcpServers?.healthyServers || 0;
            document.getElementById('healthyCount').textContent = healthyCount;

        } catch (error) {
            console.error('Error updating server status:', error);
            const statusElement = document.getElementById('serverStatus');
            statusElement.className = 'status-indicator offline';
            statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Connection Error</span>';
        }
    }

    async updateServerList() {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/servers`);
            const servers = await response.json();
            
            const serverListElement = document.getElementById('serverList');
            
            if (servers.length === 0) {
                serverListElement.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #718096;">
                        <i class="fas fa-server" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>No MCP servers registered</p>
                        <p style="font-size: 0.9rem; margin-top: 10px;">Register your first server using the API</p>
                    </div>
                `;
                return;
            }

            const serverItems = servers.map(server => {
                const statusClass = this.getServerStatusClass(server.status);
                const lastSeen = server.lastHealthCheck ? 
                    new Date(server.lastHealthCheck).toLocaleString() : 'Never';
                
                return `
                    <div class="server-item">
                        <div class="server-info">
                            <div class="server-name">${server.name || server.id}</div>
                            <div class="server-url">${server.url}</div>
                            <div style="font-size: 0.8rem; color: #718096; margin-top: 4px;">
                                Last seen: ${lastSeen}
                            </div>
                            ${server.capabilities ? `
                                <div style="font-size: 0.8rem; color: #4a5568; margin-top: 2px;">
                                    Capabilities: ${server.capabilities.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div class="server-status ${statusClass}">${server.status || 'unknown'}</div>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" 
                                        onclick="dashboard.checkServerHealth('${server.id}')">
                                    <i class="fas fa-heartbeat"></i>
                                </button>
                                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; background: #fed7d7; color: #742a2a;" 
                                        onclick="dashboard.unregisterServer('${server.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            serverListElement.innerHTML = serverItems;

        } catch (error) {
            console.error('Error updating server list:', error);
            document.getElementById('serverList').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f56565;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Error loading server list</p>
                </div>
            `;
        }
    }

    async updateMetrics() {
        try {
            const response = await fetch(`${this.baseUrl}/metrics/summary`);
            const metrics = await response.json();
            
            const requestCount = metrics.http?.totalRequests || 0;
            document.getElementById('requestCount').textContent = requestCount.toLocaleString();

        } catch (error) {
            console.error('Error updating metrics:', error);
            document.getElementById('requestCount').textContent = 'Error';
        }
    }

    async updateCapabilities() {
        try {
            const response = await fetch(`${this.baseUrl}/discovery/capabilities`);
            const capabilities = await response.json();
            
            const capabilityCount = capabilities.length || 0;
            document.getElementById('capabilityCount').textContent = capabilityCount;

        } catch (error) {
            console.error('Error updating capabilities:', error);
            document.getElementById('capabilityCount').textContent = 'Error';
        }
    }

    async checkAlerts() {
        try {
            const response = await fetch(`${this.baseUrl}/metrics/alerts`);
            const alerts = await response.json();
            
            const alertsContainer = document.getElementById('alerts');
            
            if (alerts.length === 0) {
                alertsContainer.innerHTML = '';
                return;
            }

            const alertItems = alerts.map(alert => {
                const alertClass = alert.severity === 'critical' ? 'alert-error' : 'alert-warning';
                const icon = alert.severity === 'critical' ? 'fas fa-exclamation-circle' : 'fas fa-exclamation-triangle';
                
                return `
                    <div class="alert ${alertClass}">
                        <i class="${icon}"></i>
                        <div>
                            <strong>${alert.type}</strong>: ${alert.message}
                            <div style="font-size: 0.9rem; margin-top: 5px; opacity: 0.8;">
                                Triggered: ${new Date(alert.triggeredAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            alertsContainer.innerHTML = alertItems;

        } catch (error) {
            console.error('Error checking alerts:', error);
        }
    }

    getServerStatusClass(status) {
        switch (status) {
            case 'healthy': return 'healthy';
            case 'unhealthy': return 'unhealthy';
            default: return 'unknown';
        }
    }

    async checkServerHealth(serverId) {
        try {
            this.showAlert('Running health check...', 'info');
            
            const response = await fetch(`${this.baseUrl}/mcp/servers/${serverId}/health-check`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlert(`Health check completed for server ${serverId}`, 'success');
                await this.updateServerList();
                await this.updateServerStatus();
            } else {
                this.showAlert(`Health check failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error running health check:', error);
            this.showAlert('Error running health check', 'error');
        }
    }

    async unregisterServer(serverId) {
        if (!confirm(`Are you sure you want to unregister server ${serverId}?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/mcp/servers/${serverId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showAlert(`Server ${serverId} unregistered successfully`, 'success');
                await this.updateServerList();
                await this.updateServerStatus();
            } else {
                const error = await response.json();
                this.showAlert(`Failed to unregister server: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Error unregistering server:', error);
            this.showAlert('Error unregistering server', 'error');
        }
    }

    async runHealthCheck() {
        try {
            this.showAlert('Running health check on all servers...', 'info');
            
            const response = await fetch(`${this.baseUrl}/loadbalancer/health-check`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showAlert('Health check completed on all servers', 'success');
                await this.loadDashboardData();
            } else {
                const error = await response.json();
                this.showAlert(`Health check failed: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Error running health check:', error);
            this.showAlert('Error running health check', 'error');
        }
    }

    async viewCapabilities() {
        try {
            const response = await fetch(`${this.baseUrl}/discovery/capabilities`);
            const capabilities = await response.json();
            
            if (capabilities.length === 0) {
                alert('No capabilities available');
                return;
            }

            const capabilityList = capabilities.map(cap => `• ${cap}`).join('\n');
            alert(`Available Capabilities:\n\n${capabilityList}`);
        } catch (error) {
            console.error('Error fetching capabilities:', error);
            this.showAlert('Error fetching capabilities', 'error');
        }
    }

    showAlert(message, type = 'info') {
        const alertsContainer = document.getElementById('alerts');
        const alertId = `alert-${Date.now()}`;
        
        let alertClass, icon;
        switch (type) {
            case 'success':
                alertClass = 'alert-success';
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                alertClass = 'alert-error';
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                alertClass = 'alert-warning';
                icon = 'fas fa-exclamation-triangle';
                break;
            default:
                alertClass = 'alert-info';
                icon = 'fas fa-info-circle';
        }

        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert ${alertClass}`;
        alertElement.innerHTML = `
            <i class="${icon}"></i>
            <div>${message}</div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add success alert style if not defined
        if (type === 'success' && !document.querySelector('.alert-success')) {
            const style = document.createElement('style');
            style.textContent = `
                .alert-success {
                    background: #c6f6d5;
                    color: #22543d;
                    border-left: 4px solid #48bb78;
                }
                .alert-info {
                    background: #bee3f8;
                    color: #2a4365;
                    border-left: 4px solid #4299e1;
                }
            `;
            document.head.appendChild(style);
        }

        alertsContainer.appendChild(alertElement);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const element = document.getElementById(alertId);
            if (element) {
                element.remove();
            }
        }, 5000);
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    setupEventListeners() {
        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
                this.loadDashboardData();
            }
        });

        // Handle window focus
        window.addEventListener('focus', () => {
            this.loadDashboardData();
        });
    }
}

// Global functions for button clicks
function refreshDashboard() {
    dashboard.loadDashboardData();
}

function refreshServers() {
    dashboard.updateServerList();
    dashboard.updateServerStatus();
}

function runHealthCheck() {
    dashboard.runHealthCheck();
}

function viewCapabilities() {
    dashboard.viewCapabilities();
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new MCPDashboard();
});