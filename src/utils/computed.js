const {getJSESSIONFromJar} = require('./helpers')

const getComputedApiRequestOptions = () => {
    return {
        uri: "https://www.linkedin.com/voyager/api",
        headers: {
            "csrf-token": getJSESSIONFromJar(true),
            "referer": "https://www.linkedin.com/feed/?trk=guest_homepage-basic_nav-header-signin",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36",
            "x-li-lang": "en_US",
            "x-li-track": '{"clientVersion":"1.2.9851","osName":"web","timezoneOffset":-5,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
            "x-restli-protocol-version": "2.0.0",
            "accept-language": "en-US,en;q=0.9,pt;q=0.8,es;q=0.7"
        },
        method:'GET'
    }
}

const getComputedloginOptions = (email, password) => {
    return {
        uri: 'https://www.linkedin.com/uas/authenticate',
        headers: {
            "X-Li-User-Agent": "LIAuthLibrary:3.2.4 com.linkedin.LinkedIn:8.8.1 iPhone:8.3",
            "User-Agent": "LinkedIn/8.8.1 CFNetwork/711.3.18 Darwin/14.0.0",
            "X-User-Language": "en",
            "X-User-Locale": "en_US",
            "Accept-Language": "en-us",
        },
        form: {
            "session_key": email,
            "session_password": password,
            "JSESSIONID": getJSESSIONFromJar()
        },
        method: 'POST'
    };
} 

module.exports = {
    getComputedloginOptions,
    getComputedApiRequestOptions
}