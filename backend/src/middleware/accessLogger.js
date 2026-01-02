const { Acesso } = require('../models');
const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

const accessLogger = (actionType = 'api_call') => {
  return async (req, res, next) => {
    try {
      const clientIp = requestIp.getClientIp(req);
      const parsedUserAgent = UAParser(req.headers['user-agent']);
      const geo = geoip.lookup(clientIp);

      const accessData = {
        actionType,
        timestamp: new Date(),
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        method: req.method,
        url: req.originalUrl,
        referer: req.headers.referer || '',
        statusCode: res.statusCode,
        responseTime: res.get('X-Response-Time'),
        geo: geo ? `${geo.city}, ${geo.region}, ${geo.country}` : 'N/A',
        device: parsedUserAgent.device.model || 'N/A',
        os: parsedUserAgent.os.name || 'N/A',
        browser: parsedUserAgent.browser.name || 'N/A',
      };

      await Acesso.create(accessData);
    } catch (error) {
      console.error('Error logging access data:', error);
    }
    next();
  };
};

module.exports = accessLogger;