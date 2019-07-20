const rq = require('request');
const cookieJar = require('./utils/cookieJar.js').getCookieJar()

const { parseLinkedinUrl, requestPromise} = require('./utils/helpers')

const login = () => {
    return new Promise(async (resolve, reject) => {
        let cookieResponse = null, loginResponse = null
        try {
            cookieResponse = await requestPromise(cookieOptions)
            const loginOptions = getComputedloginOptions(cookieResponse)
            loginResponse  = await requestPromise(loginOptions)

            resolve(loginResponse)
        } catch(err) {
            reject(err)
        }
    })
}

const getProfileById = (profileID) => {
    return new Promise(async (resolve, reject) => {
        let optionsCopy = getComputedApiRequestOptions()
        const url = `${optionsCopy.uri}/identity/profiles/${profileID}/profileView`
        optionsCopy.uri = url

        let response = null;
        try {
            response = await requestPromise(optionsCopy)
            resolve(JSON.parse(response.body))
        } catch (err) {
            console.log('No Resolve', err)
            Sentry.captureException(err, 'getProfileById');
            reject(err)
        }  
    })
}

const getMoreSkills = (profileId) => {
    return new Promise(async (resolve, reject) => {
        let optionsCopy = getComputedApiRequestOptions()
        const url = `${optionsCopy.uri}/identity/profiles/${profileId}/skills`
        optionsCopy.uri = url
        optionsCopy.qs = {"count": 100, "start": 0}
        let response
        try {
            response = await requestPromise(optionsCopy)
            resolve(JSON.parse(response.body))
        } catch (err) {
            reject(err)
        }  
    })
}

const getMoreExperience = (profileId, paging) => {
    return new Promise(async (resolve, reject) => {
        let optionsCopy = getComputedApiRequestOptions()
        const url = `${optionsCopy.uri}/identity/profiles/${profileId}/positionGroups`
        optionsCopy.uri = url
        optionsCopy.qs = {"count": 100, "start": 0}
        let response = null
        try {
            response = await requestPromise(optionsCopy)
            resolve(JSON.parse(response.body))
        } catch (err) {
            reject(err)
        }  
    })
}

const getURIFromEmail = (emailAddress) => {
    return new Promise(async (resolve, reject) => {
        let optionsCopy = { ...getURIOptions }
        optionsCopy.uri = `${optionsCopy.uri}/${emailAddress}`
        try {
            let href = null
            const response = await requestPromise(optionsCopy)
            try {
                href = response.request.uri.href
            } catch(err) {
                href = response.request.uri
            }
        
            const parsedUrl = parseLinkedinUrl(href)
            if(parsedUrl) {
                return resolve(parsedUrl)
            } else {
                return reject(false)
            }

        } catch(err) {
            reject(err)
        }
    })
}

module.exports = {
    login,
    getProfileById,
    getMoreSkills,
    getMoreExperience,
    getURIFromEmail,
}