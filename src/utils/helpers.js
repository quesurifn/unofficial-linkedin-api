const sleep = () => {
    return require('util').promisify(setTimeout)
}

const randomBetween3and5 = () => {
    return Math.floor(Math.random() * 4000) + 2000
}

const sleepRandom = () => {
    return sleep(randomBetween3and5)
}

const parseLinkedinUrl = (href) => {
    if(~href.indexOf('/people/')) {
        return `https://linkedin.com/in/${href.split("/people/")[1].replace(/[`~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')}`
   } else if(~href.indexOf('/in/')) {
        return href
   } else {
        return false
   }
}

/**
 * Retrieves a cookie by name
 * @param  {String} cookies Cookies list
 * @param  {String} key Cookie key name
 * @return {String} Cookie value
 */
const getCookieValue = (cookies, key) => {
    if (!cookies || !key) {
        return '';
    }

    let cookieKey = `${key}=`;
    let ca = cookies.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(cookieKey) == 0) {
            return c.substring(cookieKey.length, c.length).replace(/"/g,'');
        }
    }

    return '';
}

/**
 * Extracts the LinkedIn handler from a profile URI
 * 1. Splits the string on the "/" character
 * 2. Removes empty elements from array.
 * 3. Finds last element of array.
 * @param  {String} profileUri User's LinkedIn Profile URI
 * @return {String}            User's LinkedIn handle
 */
const getPublicIdentifier = (profileUri) => {
    if (!profileUri) {
        return '';
    }

    if (profileUri.indexOf('linkedin.com/in/') !== -1) {
        let dirtyHandle = profileUri.split('/in/');
        if (dirtyHandle[1].indexOf('/') !== -1) {
            return dirtyHandle[1].substring(0, dirtyHandle[1].indexOf('/'));
        }
        return dirtyHandle[1];
    } else if (profileUri.indexOf('linkedin.com/pub/') !== -1) {
        let dirtyHandle = profileUri.split('/pub/')[1] || '';
        let dirtyIds = dirtyHandle.split('/') || [];
        let username = dirtyIds.shift() || '';
        return `${username}-${dirtyIds.reverse().join('')}`;
    }
    return '';
}


/**
 * Extracts the id from an urn string.
 * @param  {String} urn urn string
 * @return {String}
 */
const scrubIdFromUrn = (urn) => {
    if (!urn) {
        return '';
    }

    let pieces = urn.split(':');
    return pieces[pieces.length - 1];
}

/**
 * Extracts Root Domain from URL
 * @param  {String} companyPageUrl
 * @return {String}
 */
const extractRootDomain = (domain) => {
    if (!domain) {
        return '';
    }

    const protocolIndex = domain.indexOf('://');
    if (protocolIndex === -1 ) {
        return domain;
    }

    const parsedUrl = {};
    parsedUrl.protocol = domain.substring(0, protocolIndex);

    const remainingUrl = domain.substring(protocolIndex + 3, domain.length);
    let domainIndex = remainingUrl.indexOf('/');
    domainIndex = domainIndex == -1 ? remainingUrl.length : domainIndex;
    parsedUrl.domain = remainingUrl.substring(0, domainIndex);
    parsedUrl.path = (domainIndex == -1 || domainIndex + 1 == remainingUrl.length) ? '' : remainingUrl.substring(domainIndex + 1, remainingUrl.length);

    let domainParts = parsedUrl.domain.split('.');
    if (domainParts.length === 2) {
        parsedUrl.subdomain = null;
        parsedUrl.host = domainParts[0];
        parsedUrl.tld = domainParts[1];
    } else if (domainParts.length === 3) {
        parsedUrl.subdomain = domainParts[0];
        parsedUrl.host = domainParts[1];
        parsedUrl.tld = domainParts[2];
    } else if (domainParts.length === 4) {
        parsedUrl.subdomain = domainParts[0];
        parsedUrl.host = domainParts[1];
        parsedUrl.tld = domainParts[2] + '.' + domainParts[3];
    }

    return parsedUrl.parent_domain = parsedUrl.host + '.' + parsedUrl.tld;
}

const extendedEncodeURIComponent = (str) => {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
        return '%' + c.charCodeAt(0).toString(16);
    });
}

const fixedEncodeURIComponent = (str) => {
    return encodeURIComponent(str).replace(/%2C/g, ',');
}

module.exports = {
    sleepRandom,
    parseLinkedinUrl,
    getCookieValue,
    getPublicIdentifier,
    scrubIdFromUrn,
    extractRootDomain,
    extendedEncodeURIComponent,
    fixedEncodeURIComponent,
}
