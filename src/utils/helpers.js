const cookieJar = require('./cookieJar')
const request = rq.defaults({ jar : cookieJar });

const sleep = () => {
    return require('util').promisify(setTimeout)
}

const randomBetween3and5 = () => {
    return Math.floor(Math.random() * 4000) + 2000
}

const getJSESSIONFromJar = (voyager = false) => {
    const cookieString = cookieJar.getCookieString(cookieOptions.uri)

    if(voyager) {
        console.log(`${cookieString.split(';')[0].split('=')[1].replace(/"/g, '')}`)
        return `${cookieString.split(';')[0].split('=')[1].replace(/"/g, '')}`
    } 
    return `"${cookieString.split(';')[1].split('=')[1]}"`
}

const parseLinkedinUrl = (href) => {
    if(~href.indexOf('/people/')) {
        return `https://linkedin.com/in/${href.split("/people/")[1].replace(/[`~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')}`
   } else if(~href.indexOf('/in/')) {
        return url
   } else {
        return false
   }
} 

const requestPromise = (options) => {
    return new Promise(async (resolve, reject) => {
        await sleep(randomBetween3and5)
        request(options.uri, options, async (error, response, body) => {
            if(error || String(response.statusCode).charAt(0) !== "2" && String(response.statusCode).charAt(0) !== "3" || body.indexOf('<h1>Please sign in</h1>') > -1)  {
                console.log('error')
                reject(error || response)
            }
            resolve(response)
        })
    }) 
}

module.exports = {
    sleep,
    randomBetween3and5,
    getJSESSIONFromJar,
    parseLinkedinUrl
}