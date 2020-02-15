const querystring = require('querystring');
const rq = require('request-promise-native');
const jar = rq.jar();
const request = rq.defaults({ jar });

const {
    sleepRandom,
    parseLinkedinUrl,
    getCookieValue,
    getPublicIdentifier,
    extendedEncodeURIComponent,
    fixedEncodeURIComponent,
} = require('./utils/helpers');
const { transformCompany, transformProfile } = require('./utils/transformers');

/**
 * Class for Linkedin Voyager private API
 * Based on https://developer.linkedin.com/docs/guide/v2
 * and https://github.com/tomquirk/linkedin-api
 * and https://github.com/alanchavez88/linkedin-voyager
 */
class Voyager {
    constructor(user = null, password = null, profileId = null, publicId = null) {
        this.user = user;
        this.password = password;
        this.profileId = profileId;
        this.publicId = publicId;
        this.request = request;
        this.jar = jar;

        this.MAX_SEARCH_COUNT = 49;

        // Settings for general Linkedin API calls
        this.BASE_URL = 'https://www.linkedin.com/voyager/api';
        this.REQUEST_HEADERS = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
            'accept-language': 'en-us',
            'x-li-lang': 'en_US',
            'x-restli-protocol-version': '2.0.0',
        };

        // Settings for authenticating with Linkedin
        this.AUTH_URL = 'https://www.linkedin.com/uas/authenticate';
        this.AUTH_REQUEST_HEADERS = {
            'X-Li-User-Agent': 'LIAuthLibrary:3.2.4 com.linkedin.LinkedIn:8.8.1 iPhone:8.3',
            'User-Agent': 'LinkedIn/8.8.1 CFNetwork/711.3.18 Darwin/14.0.0',
            'X-User-Language': 'en',
            'X-User-Locale': 'en_US',
            'Accept-Language': 'en-us',
        };
    }

    /**
     * Initialize user session by getting CSRF token and profile public identifier
     * @return {Promise}
     */
    async initializeSession() {
        if (!this.token && this.user && this.password) {
            await this.getToken();
        }
        if (!this.profileId || !this.publicId) {
            const response = await this._sendRequest( `${this.BASE_URL}/me`, {
                method: 'GET',
                headers: this._getRequestHeaders()
            }).catch(err => {
                console.error(err);
                return { miniProfile: {}};
            });
            this.profileId = response.plainId || null;
            this.publicId = response.miniProfile.publicIdentifier || null;
        }
        return this.token;
    }

    /**
     * A HTTP request abstraction with random sleep.
     * @param  {String} uri
     * @param  {Object} options
     * @return {Promise}
     */
    async _sendRequest(uri, options) {
        if (options.constructor !== Object || Object.keys(options).length === 0) {
            return Promise.reject('A request options object is required');
        }

        // if the body exists and is not a string, then stringify it.
        if (options.body && options.body.constructor !== String) {
            options.body = JSON.stringify(options.body);
        }

        if (options.qs) {
            const listing = [];
            for (let [key, value] of Object.entries(options.qs)) {
                let list = '';
                if (value.constructor === Array) {
                    list = `List(${value.join(',')})`;
                } else if (value.constructor === String && value.includes('List(')) {
                    list = value;
                }
                if (list) {
                    listing.push(`${key}=${fixedEncodeURIComponent(list)}`);
                    delete options.qs[key];
                }
            }
            if (listing.length) {
                uri += `?${listing.join('&')}&${querystring.encode(options.qs, null, null, {
                    encodeURIComponent: extendedEncodeURIComponent
                })}`;
                delete options.qs;
            }
        }

        await sleepRandom();
        const res = await this.request(uri, {
            credentials: 'same-origin',
            ...options,
            resolveWithFullResponse: true,
        });

        if (String(res.statusCode).charAt(0) !== "2" && String(res.statusCode).charAt(0) !== "3" || !res.body
            || (res.body.constructor === String && res.body.indexOf('<h1>Please sign in</h1>') > -1)) {
            throw new Error(res);
        }

        if (options.raw) {
            return res;
        }

        return JSON.parse(res.body);
    }

    /**
     * Get current JSESSIONID from session cookie
     * @param  {String} uri
     * @return {String}
     */
    _getSessionCookie(uri = this.AUTH_URL) {
        if (!this.jar) {
            return '';
        }
        const cookieString = this.jar.getCookieString(uri);
        return getCookieValue(cookieString, 'JSESSIONID');
    }

    /**
     * RetrieveS CSRF token from Linkedin
     * @return {String}
     */
    async getToken() {
        const cookieInstance = this.jar._jar.store;
        if (cookieInstance && !cookieInstance.isEmpty() && !cookieInstance.checkExpired('www.linkedin.com', '/', 'JSESSIONID')) {
            this.token = await this._getSessionCookie();
        } else if (!this.token) {
            if (!this.user || !this.password) {
                throw new Error('User and password are required to retrieve token.');
            }
            // Initialize session cookie 
            await this._sendRequest(this.AUTH_URL, {
                method: 'GET',
                headers: this.AUTH_REQUEST_HEADERS,
            });
            try {
                // Authenticating with user and password
                await this._sendRequest(this.AUTH_URL, {
                    method: 'POST',
                    form: {
                        'session_key': this.user,
                        'session_password': this.password,
                        'JSESSIONID': await this._getSessionCookie(),
                    },
                    headers: this.AUTH_REQUEST_HEADERS,
                });
                this.token = await this._getSessionCookie();
            } catch (error) {
                console.log('Access Token Error', error.message);
                const json = JSON.parse(error.response.body || {});
                this.token = json;
            }
        }

        return this.token;
    }

    /**
     * Gets the challenge url from response.
     * @param  {String} challengeUrl
     * @return {Object}
     */
    async getChallenge(challengeUrl = null) {
        if (challengeUrl) {
            return this._sendRequest(challengeUrl, {
                method: 'GET',
                headers: this.AUTH_REQUEST_HEADERS,
            }).catch(err => {
                if (err.response.body) {
                    return Promise.resolve(err.response.body);
                }
                return Promise.reject(err); 
            });
        } else if (this.token && this.token.constructor === Object) {
            return this.token;
        } else {
            return false;
        }
    }

    /**
     * Gets the profile URI from user email.
     * @param  {String} email
     * @return {Promise}
     */
    async getUriFromEmail(email) {
        let href = `https://www.linkedin.com/sales/gmail/profile/proxy/${encodeURIComponent(email)}`;
        const response = await this._sendRequest(href, {
            method: 'GET',
            headers: this.AUTH_REQUEST_HEADERS,
            raw: true,
        });
        try {
            href = response.request.uri.href;
        } catch (err) {
            href = response.request.uri;
        }

        const parsedUrl = parseLinkedinUrl(href);
        if (parsedUrl) {
            return Promise.resolve(parsedUrl);
        } else {
            return Promise.reject(false);
        }
    }

    /**
     * Gets the profile public identifier from user email.
     * @param  {String} email
     * @return {Promise}
     */
    async getProfileIdFromEmail(email) {
        const profileUri = await this.getUriFromEmail(email);
        return getPublicIdentifier(profileUri);
    }

    /**
     * Gets the full profile information
     * @param  {String} profileId LinkedIn profile identifier
     * @return {Promise}
     */
    getProfileById(profileId, light = false) {
        if (!profileId) {
            throw new Error('A profile identifier is required');
        }

        let resources = ['profileView'];
        if (!light) {
            resources = ['profileView', 'profileContactInfo', 'highlights', 'skills', 'positionGroups'];
        }
        return Promise.all(resources.map(resource => this._getProfileResource(profileId, resource)))
            .then((responses) => {
                const fullProfile = { identifier: profileId };
                responses.map(res => Object.assign(fullProfile, res));
                return Promise.resolve(transformProfile(fullProfile));
            });
    }

    /**
     * Retrieves company information from LinkedIn API.
     * @param  {Integer} companyId LinkedIn's company ID
     * @return {Promise}
     */
    getCompanyById(companyId = null) {
        const query = {
            'decorationId': 'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
            'q': 'universalName',
            'universalName': companyId,
        };
        const url = `${this.BASE_URL}/organization/companies`;
        const options = {
            method: 'GET',
            qs: query,
            headers: this._getRequestHeaders()
        };
        return this._sendRequest(url, options)
            .then((res) => {
                return Promise.resolve(res.elements.map(transformCompany));
            })
            .catch((err) => {
                return Promise.resolve({});
            });
    }

    /**
     * Retrieves group information from LinkedIn API.
     * @param  {Integer} groupId LinkedIn's group ID
     * @return {Promise}
     */
    getGroupById(groupId = null) {
        const url = `${this.BASE_URL}/groups/groups/urn%3Ali%3Agroup%3A${groupId}`;
        const options = {
            method: 'GET',
            headers: this._getRequestHeaders()
        };
        return this._sendRequest(url, options)
            .then((res) => {
                return Promise.resolve(res);
            })
            .catch((err) => {
                return Promise.resolve({});
            });
    }

    /**
     * Retrieves all information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchAll(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        return this._searchGenericBlended({
            ...query,
            'origin': 'SWITCH_SEARCH_VERTICAL',
            'queryContext': [
                'spellCorrectionEnabled->true',
                'relatedSearchesEnabled->true',
                'kcardTypes->PROFILE|COMPANY|JOB_TITLE',
            ],
            'filters': filters,
        });
    }

    /**
     * Retrieves profile information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchProfiles(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        filters.push('v->PEOPLE');
        if (!query.decoration && !query.decorationId) {
            const decoration = (
                '(' +
                    'trackingId,' +
                    'hitInfo(' +
                        'com.linkedin.voyager.search.FacetSuggestion,com.linkedin.voyager.search.SecondaryResultContainer,' +
                        'com.linkedin.voyager.search.SearchProfile(' +
                            '*,id,educations,' +
                            'memberBadges(' +
                                'influencer,jobSeeker,openLink,premium' +
                            '),' +
                            'miniProfile(' +
                                'backgroundImage,firstName,lastName,occupation,objectUrn,picture,publicIdentifier,trackingId' +
                            ')' +
                        ')' +
                    ')' +
                ')'
            );
            query.decoration = decoration;
        }
        return this._searchGeneric({
            // 'decorationId': 'com.linkedin.voyager.search.Guide',
            // 'origin': 'SWITCH_SEARCH_VERTICAL',
            ...query,
            // 'queryContext': 'List(spellCorrectionEnabled->true,relatedSearchesEnabled->true,kcardTypes->PROFILE)',
            'guides': filters,
        });
    }

    /**
     * Retrieves job information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchJobs(query = {}) {
        if (!query.decoration && !query.decorationId) {
            query.decorationId = 'com.linkedin.voyager.deco.jserp.WebJobSearchHit-17';
        }
        const qs = {
            'count': this.MAX_SEARCH_COUNT,
            // 'filters': 'List()',
            'origin': 'JOB_SEARCH_RESULTS_PAGE',
            'q': 'jserpAll',
            'start': 0,
            ...query,
        };
        const url = `${this.BASE_URL}/search/hits`;
        const options = {
            method: 'GET',
            qs: qs,
            headers: this._getRequestHeaders({
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
            })
        };

        return this._sendRequest(url, options)
            .then((res) => {
                return Promise.resolve(res);//res.data.elements);
            })
            .catch((err) => {
                return Promise.resolve([]);
            });
    }

    /**
     * Retrieves content information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchContents(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        filters.push('resultType->CONTENT');
        const qs = {
            'count': this.MAX_SEARCH_COUNT,
            'filters': filters,
            'origin': 'GLOBAL_SEARCH_HEADER',
            'q': 'all',
            'start': 0,
            ...query,
        };
        const url = `${this.BASE_URL}/search/blended`;
        const options = {
            method: 'GET',
            qs: qs,
            headers: this._getRequestHeaders({
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
            })
        };

        return this._sendRequest(url, options)
            .catch((err) => {
                return Promise.resolve([]);
            });
    }

    /**
     * Retrieves company information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchCompanies(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        filters.push('v->COMPANIES');
        if (!query.decoration && !query.decorationId) {
            const decoration = (
                '(' +
                    'trackingId,' +
                    'hitInfo(' +
                        'com.linkedin.voyager.search.FacetSuggestion,com.linkedin.voyager.search.SecondaryResultContainer,' +
                        'com.linkedin.voyager.search.SearchCompany(' +
                            'backendUrn,id,industry,location,' +
                            'following(' +
                                'followerCount,following,followingCount' +
                            '),' +
                            'company(' +
                                'active,logo,name,objectUrn,showcase,size?,universalName,trackingId' +
                            ')' +
                        ')' +
                    ')' +
                ')'
            );
            // query.decoration = decoration;
        }
        return this._searchGeneric({
            ...query,
            // 'origin': 'SWITCH_SEARCH_VERTICAL',
            // 'decorationId': 'com.linkedin.voyager.search.SearchHitV2',
            // 'decorationId': 'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
            'guides': filters,
        });
    }

    /**
     * Retrieves company extended information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchCompaniesExtended(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        filters.push('resultType->COMPANIES');
/*         if (!query.decoration && !query.decorationId) {
            const decoration = (
                '(' +
                    'trackingId,' +
                    'hitInfo(' +
                        'com.linkedin.voyager.search.FacetSuggestion,com.linkedin.voyager.search.SecondaryResultContainer,' +
                        'com.linkedin.voyager.search.SearchCompany(' +
                            'backendUrn,id,industry,location,' +
                            'following(' +
                                'followerCount,following,followingCount' +
                            '),' +
                            'company(' +
                                'active,logo,name,objectUrn,showcase,universalName,trackingId' +
                            ')' +
                        ')' +
                    ')' +
                ')'
            );
            query.decoration = decoration;
        } */
        return this._searchGenericBlended({
            ...query,
            'origin': 'FACETED_SEARCH',
            // 'decorationId': 'com.linkedin.voyager.search.SearchHitV2',
            // 'decorationId': 'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
            'filters': filters,
        });
    }

    /**
     * Retrieves groups information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchGroups(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        filters.push('v->GROUPS');
        if (!query.decoration && !query.decorationId) {
            const decoration = (
                '(' +
                    'trackingId,' +
                    'hitInfo(' +
                        'com.linkedin.voyager.search.FacetSuggestion,com.linkedin.voyager.search.SecondaryResultContainer,' +
                        'com.linkedin.voyager.search.SearchGroup(' +
                            'id,memberCount,open,' +
                            'group(' +
                                'groupDescription,groupName,logo,objectUrn,recentActivityCount,trackingId' +
                            ')' +
                        ')' +
                    ')' +
                ')'
            );
            query.decoration = decoration;
        }
        return this._searchGeneric({
            ...query,
            'guides': filters,
        });
    }

    /**
     * Retrieves schools information from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    searchSchools(query = {}) {
        let filters = query.filters || query.guides || [];
        if (filters.constructor === String) {
            filters = [filters];
            query.filters = undefined;
        }
        filters.push('v->SCHOOLS');
        if (!query.decoration && !query.decorationId) {
            const decoration = (
                '(' +
                    'trackingId,' +
                    'hitInfo(' +
                        'com.linkedin.voyager.search.FacetSuggestion,com.linkedin.voyager.search.SecondaryResultContainer,' +
                        'com.linkedin.voyager.search.SearchSchool(' +
                            'backendUrn,id,location,studentAndAlumniCount,' +
                            'following(' +
                                'followerCount,following,followingCount' +
                            '),' +
                            'school(' +
                                'active,logo,objectUrn,schoolName,trackingId' +
                            ')' +
                        ')' +
                    ')' +
                ')'
            );
            query.decoration = decoration;
        }
        return this._searchGeneric({
            ...query,
            'guides': filters,
        });
    }

    /**
     * Performs a generic search from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    async _searchGeneric(query = {}) {
        const qs = {
            'count': this.MAX_SEARCH_COUNT,
            'guides': 'List()',
            'origin': 'OTHER',
            'q': 'guided',
            'start': 0,
            ...query,
        };
        const url = `${this.BASE_URL}/search/hits`;
        const options = {
            method: 'GET',
            qs: qs,
            headers: this._getRequestHeaders({
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
            })
        };

        const response = await this._sendRequest(url, options)
            .catch((err) => {
                return Promise.resolve([]);
            });
        const result = response;
        // const result = [];
        // res.data.elements.forEach(el => {
        //     el.elements.forEach(element => {
        //         result.push(element);
        //     });
        // });
        return result;
    }

    /**
     * Performs a generic search (Blended) from LinkedIn API.
     * @param  {Object} query
     * @return {Promise}
     */
    async _searchGenericBlended(query = {}) {
        const qs = {
            'count': this.MAX_SEARCH_COUNT,
            'filters': 'List()',
            'origin': 'CLUSTER_EXPANSION',
            'q': 'all',
            'queryContext': [
                'spellCorrectionEnabled->true',
            ],
            'start': 0,
            ...query,
        };
        const url = `${this.BASE_URL}/search/blended`;
        const options = {
            method: 'GET',
            qs: qs,
            headers: this._getRequestHeaders({
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
            })
        };

        return this._sendRequest(url, options)
            .catch((err) => {
                return Promise.resolve([]);
            });
    }

    /**
     * Gets headers with CSRF token to be used in API requests
     * @param  {String} publicId LinkedIn public identifier
     * @return {Promise}
     */
    _getRequestHeaders(headers) {
        if (!this.token || this.token.constructor !== String) {
            throw new Error('A CSRF token is required before making this request.');
        }
        const h = this.REQUEST_HEADERS;
        h['csrf-token'] = this.token;
        if (headers && headers.constructor === Object) {
            Object.keys(headers).forEach((key) => {
                h[key] = headers[key];
            });
        }
        return h;
    }

    /**
     * Gets a resource from the identity/profiles API.
     * @param  {String} publicId
     * @param  {String} resource
     * @return {Object}
     */
    async _getProfileResource(publicId, resource) {
        let uri = `${this.BASE_URL}/identity/profiles/${publicId}/`;

        if (!resource) {
            uri += 'profileView';
        } else if (resource === 'skills' || resource === 'positionGroups') {
            uri += `${resource}?count=${this.MAX_SEARCH_COUNT}&start=0`;
        } else {
            uri += resource;
        }

        const options = {
            method: 'GET',
            headers: this._getRequestHeaders()
        };

        let result = {};
        try {
            const response = await this._sendRequest(uri, options);
            if (response.data) {
                result = response.data.element;
            } else {
                result = response;
            }
        } catch(err) {
            console.log(err);
        }
        return result;
    }
}

module.exports = {
    Voyager,
}
