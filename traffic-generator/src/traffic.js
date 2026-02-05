/**
 * Traffic generation engine with mode-based request patterns
 */

const axios = require('axios');
const { log } = require('./logger');

// Traffic mode configuration
const MODES = {
  steady: { rps: 2, duration: null },
  burst: { rps: 20, duration: null },
  overload: { rps: 100, duration: null },
  pause: { rps: 0, duration: null }
};

// Request type distribution
const REQUEST_TYPES = {
  CREATE_ORDER: 0.60,  // 60%
  LIST_ORDERS: 0.25,   // 25%
  GET_ORDER: 0.15      // 15%
};

class TrafficGenerator {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.currentMode = 'pause';
    this.intervalId = null;
    this.recentOrderIds = [];  // Ring buffer for GET requests
    this.maxRecentOrders = 50;

    // Statistics tracking
    this.stats = {
      total_requests: 0,
      successful: 0,
      failed: 0,
      by_endpoint: {
        'POST /orders': 0,
        'GET /orders': 0,
        'GET /orders/:id': 0
      }
    };

    // Periodic stats logging
    this.statsInterval = setInterval(() => {
      this.logStats();
    }, 30000); // Every 30 seconds
  }

  start() {
    log('info', 'Traffic generator started');
  }

  stop() {
    this.setMode('pause');
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    log('info', 'Traffic generator stopped');
  }

  setMode(modeName) {
    if (!MODES[modeName]) {
      log('error', `Invalid mode: ${modeName}`);
      return false;
    }

    // Clear existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentMode = modeName;
    const mode = MODES[modeName];

    log('info', `Mode changed to ${modeName}`, { rps: mode.rps });

    if (mode.rps > 0) {
      // Calculate interval with jitter
      const baseInterval = 1000 / mode.rps; // ms per request

      // Start generating traffic
      this.intervalId = setInterval(() => {
        // Add jitter: +/- 20%
        const jitter = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2
        const delay = baseInterval * (1 + jitter);

        setTimeout(() => {
          this.generateRequest();
        }, Math.max(0, delay - baseInterval));
      }, baseInterval);
    }

    return true;
  }

  async generateRequest() {
    const rand = Math.random();
    let requestType;

    if (rand < REQUEST_TYPES.CREATE_ORDER) {
      requestType = 'CREATE_ORDER';
    } else if (rand < REQUEST_TYPES.CREATE_ORDER + REQUEST_TYPES.LIST_ORDERS) {
      requestType = 'LIST_ORDERS';
    } else {
      requestType = 'GET_ORDER';
    }

    try {
      switch (requestType) {
        case 'CREATE_ORDER':
          await this.createOrder();
          break;
        case 'LIST_ORDERS':
          await this.listOrders();
          break;
        case 'GET_ORDER':
          await this.getOrder();
          break;
      }
      this.stats.successful++;
    } catch (error) {
      this.stats.failed++;
      log('error', 'Request failed', {
        type: requestType,
        error: error.message,
        code: error.code
      });
    }

    this.stats.total_requests++;
  }

  async createOrder() {
    const productId = Math.floor(Math.random() * 10) + 1; // 1-10
    const quantity = Math.floor(Math.random() * 5) + 1;   // 1-5

    const response = await axios.post(`${this.targetUrl}/orders`, {
      product_id: productId,
      quantity: quantity
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.stats.by_endpoint['POST /orders']++;

    // Store order ID for future GET requests
    if (response.data && response.data.id) {
      this.recentOrderIds.push(response.data.id);
      if (this.recentOrderIds.length > this.maxRecentOrders) {
        this.recentOrderIds.shift(); // Remove oldest
      }
    }
  }

  async listOrders() {
    await axios.get(`${this.targetUrl}/orders`, {
      timeout: 5000
    });

    this.stats.by_endpoint['GET /orders']++;
  }

  async getOrder() {
    // If we have recent order IDs, use one; otherwise skip
    if (this.recentOrderIds.length === 0) {
      // Fall back to list orders instead
      await this.listOrders();
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.recentOrderIds.length);
    const orderId = this.recentOrderIds[randomIndex];

    await axios.get(`${this.targetUrl}/orders/${orderId}`, {
      timeout: 5000
    });

    this.stats.by_endpoint['GET /orders/:id']++;
  }

  logStats() {
    if (this.stats.total_requests > 0) {
      log('info', 'Traffic statistics', {
        mode: this.currentMode,
        rps: MODES[this.currentMode].rps,
        total: this.stats.total_requests,
        successful: this.stats.successful,
        failed: this.stats.failed,
        success_rate: (this.stats.successful / this.stats.total_requests * 100).toFixed(2) + '%',
        by_endpoint: this.stats.by_endpoint
      });
    }
  }

  getStatus() {
    return {
      mode: this.currentMode,
      rps: MODES[this.currentMode].rps,
      stats: {
        total: this.stats.total_requests,
        successful: this.stats.successful,
        failed: this.stats.failed,
        by_endpoint: this.stats.by_endpoint
      }
    };
  }
}

module.exports = TrafficGenerator;
