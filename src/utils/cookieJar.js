const request = require('request');

const getCookieJar = () => {
    const cookieJar = request.jar();
    return cookieJar
}

module.exports = {
  getCookieJar
}