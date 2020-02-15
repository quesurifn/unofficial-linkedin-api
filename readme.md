# Linkedin Unofficial API 

## Disclaimer
- This is an unofficial API for linked in. Use at your own risk. This package could break if Linkedin does a major update. 

- It is also a possibility that the account that is used could get banned. However, in all of my testing I haven't seen this happen. This package has a random sleep timer to help stay under-the-radar.

- The `getUriFromEmail` function uses linkedin navigator. There is a relatively low rate-limit here for normal accounts and slightly higher premium accounts. Think 70 and 500ish respectively. 

## Contributing

This project was open sourced to help add new endpoints. 

You can find the endpoints for new elements by loading linkedin.com (logged in), and right-click 'view source'. 

From there the endpoints will be in the source code. 

![Image of linkedin source](https://quesoportfolio.s3-us-west-2.amazonaws.com/Screen+Shot+2019-07-20+at+3.25.36+PM.png)

From there you can use the Dev Tools network tab to find the headers that are used. Usually it requires a `crsf-token` header with a value found in the cookie from when you login. There is a helper function for this located in `src/index` called `_getSessionCookie`.

Right now the transformer is pretty messy. I'd appreciate help cleaning it up.

To contribute, please open an issue or PR and document any changes for the end user. I will approve review and approve them. 

I will write tests.

## Example
```
const { Voyager } = require('unofficial-linkedin-api');

(async () => {

    try {
        const client = new Voyager(process.env.EMAIL, process.env.PASSWORD);

        // Login Cookie Saved
        await client.initializeSession();

        const identifier = client.getProfileIdFromEmail('test@gmail.com');

        /* The second parameter, if true, uses the transformer to remove proprietary linkedin junk and 
        * also gets more skills and experience. The skills and experience initially returned are limited.
        */

        const profile = client.getProfileById(identifier, false);

        console.log(profile);

    } catch(e) {
        console.error(e);
    }

})()
```
